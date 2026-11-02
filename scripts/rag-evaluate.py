#!/usr/bin/env python3
"""Fixed-public-question retrieval evaluation. Does not generate LLM answers.

No API keys are read: requests go to the running application's search endpoint.
Real runs invoke the application's paid embedding API. --dry-run is offline.
"""

import argparse
import json
import math
from pathlib import Path
import statistics
import sys
import time
import urllib.error
import urllib.parse
import urllib.request


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_FIXTURE = ROOT / "docs/rag/fixtures/questions.json"


def read_fixture(path):
    payload = json.loads(path.read_text(encoding="utf-8"))
    questions = payload.get("questions")
    if not isinstance(questions, list) or not questions:
        raise ValueError("fixture.questions must be a nonempty list")
    seen = set()
    for q in questions:
        if not isinstance(q, dict):
            raise ValueError("each question must be an object")
        for key in ("id", "programId", "query"):
            if not isinstance(q.get(key), str) or not q[key].strip():
                raise ValueError("every question needs nonempty id, programId and query")
        if q["id"] in seen:
            raise ValueError("duplicate question id")
        seen.add(q["id"])
        sections = q.get("expectedAnySections")
        if not isinstance(sections, list) or any(not isinstance(s, str) or not s for s in sections):
            raise ValueError("expectedAnySections must be a list of nonempty strings")
        if not sections and not q.get("reviewReason"):
            raise ValueError("manual-review cases need reviewReason")
    return payload


def percentile(values, fraction):
    if not values:
        return None
    return round(sorted(values)[max(0, math.ceil(len(values) * fraction) - 1)], 2)


def evaluate_response(question, response):
    """Section hit is a retrieval proxy, not an answer correctness score."""
    if not isinstance(response, dict) or not isinstance(response.get("evidence"), list):
        raise ValueError("response must contain an evidence list")
    evidence = response["evidence"]
    if any(not isinstance(e, dict) for e in evidence):
        raise ValueError("invalid evidence item")
    sections = [e.get("section") for e in evidence]
    program_ok = response.get("programId") == question["programId"]
    # This also catches mixed-policy source URLs in this Ontong-only fixture.
    policy_id = question["programId"].removeprefix("ontong-")
    source_ok = all(
        isinstance(e.get("sourceUrl"), str)
        and urllib.parse.urlparse(e["sourceUrl"]).hostname == "www.youthcenter.go.kr"
        and urllib.parse.urlparse(e["sourceUrl"]).path.rstrip("/").endswith("/" + policy_id)
        for e in evidence
    )
    expected = question["expectedAnySections"]
    hit = (
        response.get("status") == "OK"
        and program_ok and source_ok
        and any(s in expected for s in sections)
    ) if expected else None
    return {
        "status": response.get("status"),
        "documentVersion": response.get("documentVersion"),
        "sectionHit": hit,
        "programMatches": program_ok,
        "evidenceSourcesMatch": source_ok,
        "returnedSections": sections,
        "evidence": evidence,
        "embeddingMs": response.get("embeddingMs"),
        "searchMs": response.get("searchMs"),
        "manualReview": not bool(expected),
        "reviewReason": question.get("reviewReason"),
    }


def request_search(base_url, question, top_k, timeout):
    body = json.dumps({
        "programId": question["programId"], "query": question["query"], "topK": top_k,
    }, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        base_url + "/api/v1/rag/search", data=body,
        headers={"Content-Type": "application/json"}, method="POST",
    )
    with urllib.request.urlopen(request, timeout=timeout) as result:
        return json.load(result)


def markdown(report):
    s = report["summary"]
    lines = [
        "# RAG 검색 평가 결과", "",
        "고정 개발 질문의 섹션 검색을 측정했다. 최종 답변 정확도·환각률·RAG 미사용 대비 개선율을 측정한 결과가 아니다.", "",
        f"- Fixture: `{report['fixtureVersion']}` / topK: {report['topK']} / 반복: {report['repeats']}",
        f"- 실행 모델 메모: {report['modelLabel'] or '미기록 — 서버 설정 확인 필요'}",
        f"- 양성 질문 섹션 hit@K: {s['positiveHits']}/{s['positiveRuns']} ({s['sectionHitRate']})",
        f"- 사람 검토 대상 실행: {s['manualReviewRuns']}",
        f"- HTTP/응답 형식 오류: {s['errors']}",
        f"- 공고/출처 불일치: {s['scopeMismatches']}",
        f"- 요청 전체 시간 p50/p95: {s['latencyP50Ms']} / {s['latencyP95Ms']} ms",
        "", "| 질문 | 회차 | 상태 | 섹션 hit | 전체 시간(ms) | 반환 섹션 |",
        "|---|---:|---|---|---:|---|",
    ]
    for row in report["runs"]:
        hit = "검토 필요" if row.get("manualReview") else str(row.get("sectionHit", False))
        sections = ", ".join(str(s) for s in row.get("returnedSections", []))
        lines.append(f"| {row['questionId']} | {row['repeat']} | {row.get('status', 'ERROR')} | {hit} | {row['elapsedMs']} | {sections.replace('|', '/')} |")
    lines += ["", "비용과 최종 답변 품질은 미측정. 세부 근거·문서 버전·오류 유형은 같은 폴더의 evaluation.json에 있다.", ""]
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://localhost:8080")
    parser.add_argument("--fixture", type=Path, default=DEFAULT_FIXTURE)
    parser.add_argument("--output-dir", type=Path, default=ROOT / "backend/build/rag")
    parser.add_argument("--top-k", type=int, default=3, choices=range(1, 9))
    parser.add_argument("--repeats", type=int, default=1)
    parser.add_argument("--timeout", type=float, default=45)
    parser.add_argument("--model-label", default="", help="Server model/dimensions for this run; descriptive only")
    parser.add_argument("--dry-run", action="store_true", help="Validate fixture only; no network or paid API calls")
    args = parser.parse_args()
    if not 1 <= args.repeats <= 20 or args.timeout <= 0:
        parser.error("repeats must be 1..20 and timeout must be positive")
    parsed = urllib.parse.urlparse(args.base_url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc or parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path not in ("", "/"):
        parser.error("base-url must be an HTTP(S) origin without credentials, query, fragment or path")
    try:
        fixture = read_fixture(args.fixture)
    except (OSError, ValueError) as exc:
        print("Invalid fixture: " + str(exc), file=sys.stderr)
        return 2
    questions = fixture["questions"]
    positives = sum(bool(q["expectedAnySections"]) for q in questions)
    if args.dry_run:
        print(f"Fixture valid: {len(questions)} questions, {positives} section checks, {len(questions)-positives} manual-review cases. No API calls.")
        return 0

    print(f"Running {len(questions) * args.repeats} search requests. The server will call the embedding API.")
    runs = []
    for repeat in range(1, args.repeats + 1):
        for question in questions:
            started = time.perf_counter()
            row = {"questionId": question["id"], "programId": question["programId"],
                   "query": question["query"], "repeat": repeat,
                   "manualReview": not bool(question["expectedAnySections"])}
            try:
                response = request_search(args.base_url.rstrip("/"), question, args.top_k, args.timeout)
                row.update(evaluate_response(question, response))
            except urllib.error.HTTPError as exc:
                row.update(status="HTTP_ERROR", errorType="HTTPError", httpStatus=exc.code)
            except (urllib.error.URLError, TimeoutError, OSError, ValueError) as exc:
                # Avoid dumping response contents, credentials or URLs from exceptions.
                row.update(status="ERROR", errorType=type(exc).__name__)
            row["elapsedMs"] = round((time.perf_counter() - started) * 1000, 2)
            runs.append(row)
            print(f"{question['id']} [{repeat}] {row.get('status')} {row['elapsedMs']} ms")

    positive_runs = [r for r in runs if not r["manualReview"]]
    hits = sum(r.get("sectionHit") is True for r in positive_runs)
    successful = [r["elapsedMs"] for r in runs if "errorType" not in r]
    report = {
        "fixtureVersion": fixture.get("version"), "topK": args.top_k, "repeats": args.repeats,
        "modelLabel": args.model_label, "createdAtUtc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "summary": {
            "positiveRuns": len(positive_runs), "positiveHits": hits,
            "sectionHitRate": round(hits / len(positive_runs), 4) if positive_runs else None,
            "manualReviewRuns": len(runs) - len(positive_runs),
            "errors": sum("errorType" in r for r in runs),
            "scopeMismatches": sum(r.get("programMatches") is False or r.get("evidenceSourcesMatch") is False for r in runs),
            "latencyP50Ms": round(statistics.median(successful), 2) if successful else None,
            "latencyP95Ms": percentile(successful, 0.95),
        },
        "runs": runs,
    }
    args.output_dir.mkdir(parents=True, exist_ok=True)
    (args.output_dir / "evaluation.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (args.output_dir / "evaluation.md").write_text(markdown(report), encoding="utf-8")
    print(json.dumps(report["summary"], ensure_ascii=False))
    print("Reports: " + str(args.output_dir))
    return 1 if report["summary"]["errors"] or report["summary"]["scopeMismatches"] else 0


if __name__ == "__main__":
    sys.exit(main())
