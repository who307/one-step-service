package com.onkey.onestep.integration;

import java.net.http.HttpClient;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.StringJoiner;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.onkey.onestep.common.ApiException;
import com.onkey.onestep.common.AppProperties;
import com.onkey.onestep.common.ErrorCode;
import com.onkey.onestep.integration.NoticeAnalyzer.Found;
import com.onkey.onestep.program.Category;
import com.onkey.onestep.program.Mode;
import com.onkey.onestep.program.Program;

import lombok.extern.slf4j.Slf4j;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * 온통청년 청년정책 API({@code /go/ythip/getPlcy}) 연동. {@code onestep.youth-center.enabled=true} 일 때만 활성화된다.
 * <ul>
 *   <li>등록된 정책 전체를 1,000건씩 나눠 받아 그중 서울시가 진행하는 정책만 메모리에 둔다(공개 공고라 사용자 데이터가 아님). 6시간이 지나면 지난 목록으로 응답하면서 뒤에서 새로 받는다.</li>
 *   <li>신청·사업 기간이 끝난 정책도 목록에 두되 closed=true 로 표시하고 뒤로 보낸다.</li>
 *   <li>활동 종류·참여 방식·장소·준비물은 {@link NoticeAnalyzer} 가 공고 문장을 읽어 고른다.
 *       장소·준비물을 원문에서 못 찾으면 추정값을 ESTIMATED 로 표시한다.</li>
 *   <li>noticeText 는 "항목: 값" 줄로 만들어 타임라인 원문 인용 검증에 그대로 쓴다. 추정값은 넣지 않는다.</li>
 * </ul>
 * 사용자 데이터는 보내지 않는다. API 키와 응답 본문은 로그에 남기지 않는다.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "onestep.youth-center.enabled", havingValue = "true")
public class OntongYouthProgramProvider implements ProgramProvider {

    static final String ID_PREFIX = "ontong-";
    static final String PATH = "/go/ythip/getPlcy";
    static final String DETAIL_URL = "https://www.youthcenter.go.kr/youthPolicy/ythPlcyTotalSearch/ythPlcyDetail/";
    static final int PAGE_SIZE = 1000;
    /** 전체 건수가 비정상적으로 클 때 멈추는 안전장치 */
    static final int MAX_PAGES = 20;
    static final int NOTICE_MAX = 4000;
    static final Duration CACHE_TTL = Duration.ofHours(6);
    private static final DateTimeFormatter YMD = DateTimeFormatter.BASIC_ISO_DATE;
    private static final Pattern YMD_RANGE = Pattern.compile("(\\d{8})\\s*~\\s*(\\d{8})");
    private static final String LOAD_FAILED = "온통청년 공고를 불러오지 못했어요. 다시 시도하거나 예시로 진행해 주세요.";

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;

    private volatile List<Program> cache = List.of();
    private volatile Map<String, Program> byId = Map.of();
    private volatile Instant cachedAt = Instant.EPOCH;
    private final AtomicBoolean refreshing = new AtomicBoolean(false);

    public OntongYouthProgramProvider(AppProperties properties, ObjectMapper objectMapper) {
        AppProperties.YouthCenter yc = properties.youthCenter();
        this.apiKey = yc == null || yc.apiKey() == null ? "" : yc.apiKey().trim();
        String baseUrl = yc == null || yc.baseUrl() == null || yc.baseUrl().isBlank()
                ? "https://www.youthcenter.go.kr" : yc.baseUrl().trim();
        this.objectMapper = objectMapper;

        HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(Duration.ofSeconds(30));
        this.restClient = RestClient.builder().baseUrl(baseUrl).requestFactory(factory).build();

        if (apiKey.isEmpty()) {
            log.warn("youth-center enabled but YOUTHCENTER_API_KEY is empty; program calls will fail");
        }
        log.info("ontong youth program provider active");
    }

    /** 첫 화면이 기다리지 않도록 서버가 뜨면 미리 받아 둔다. 실패해도 첫 요청 때 다시 시도한다. */
    @EventListener(ApplicationReadyEvent.class)
    void warmUp() {
        if (apiKey.isEmpty()) return;
        Thread.ofVirtual().name("ontong-warmup").start(() -> {
            try {
                findAll();
            } catch (RuntimeException e) {
                log.warn("ontong warm-up failed type={}", e.getClass().getSimpleName());
            }
        });
    }

    @Override
    public String source() {
        return "ONTONG";
    }

    /**
     * 받아 둔 목록이 있으면 잠금 없이 바로 돌려준다. 6시간이 지났으면 지난 목록을 돌려주면서 뒤에서 새로 받는다.
     * 처음(목록이 비었을 때)만 받아 올 때까지 기다린다.
     */
    @Override
    public List<Program> findAll() {
        List<Program> current = cache;
        if (current.isEmpty()) {
            return load();
        }
        if (!Instant.now().isBefore(cachedAt.plus(CACHE_TTL)) && refreshing.compareAndSet(false, true)) {
            Thread.ofVirtual().name("ontong-refresh").start(() -> {
                try {
                    load();
                } catch (RuntimeException e) {
                    log.warn("ontong refresh failed type={}", e.getClass().getSimpleName());
                } finally {
                    refreshing.set(false);
                }
            });
        }
        return current;
    }

    /** 동시에 여러 번 받지 않도록 잠근다. 기다리는 동안 다른 요청이 이미 받아 왔으면 그것을 쓴다. */
    private synchronized List<Program> load() {
        if (!cache.isEmpty() && Instant.now().isBefore(cachedAt.plus(CACHE_TTL))) {
            return cache;
        }
        long started = System.nanoTime();
        LocalDate today = LocalDate.now();
        Map<String, Program> merged = new LinkedHashMap<>();
        int total = Integer.MAX_VALUE;
        for (int page = 1; page <= MAX_PAGES && (page - 1) * PAGE_SIZE < total; page++) {
            Page p = fetch(Map.of("pageNum", String.valueOf(page), "pageSize", String.valueOf(PAGE_SIZE)));
            total = p.total();
            if (p.items().isEmpty()) break;
            for (JsonNode item : p.items()) {
                if (!isSeoul(item)) continue;
                Program program = toProgram(item, today);
                if (program != null) merged.putIfAbsent(program.id(), program);
            }
        }
        // 신청할 수 있는 공고를 먼저(같으면 API 순서 = 최근 등록 순)
        List<Program> list = merged.values().stream()
                .sorted((a, b) -> Boolean.compare(a.closed(), b.closed()))
                .toList();
        // 잠금 없이 읽는 쪽이 새 목록과 옛 시각을 함께 보지 않도록 목록을 마지막에 바꾼다
        byId = Map.copyOf(merged);
        cachedAt = Instant.now();
        cache = list;
        log.info("ontong programs loaded count={} open={} ms={}", list.size(),
                list.stream().filter(p -> !p.closed()).count(), elapsedMs(started));
        return list;
    }

    @Override
    public Optional<Program> findById(String id) {
        if (id == null || !id.startsWith(ID_PREFIX)) {
            return Optional.empty();
        }
        Program cached = byId.get(id);
        if (cached != null) {
            return Optional.of(cached);
        }
        String plcyNo = id.substring(ID_PREFIX.length());
        if (!plcyNo.matches("\\d{1,30}")) {
            return Optional.empty();
        }
        LocalDate today = LocalDate.now();
        return fetch(Map.of("plcyNo", plcyNo, "pageSize", "1")).items().stream()
                .filter(OntongYouthProgramProvider::isSeoul)
                .map(n -> toProgram(n, today))
                .filter(p -> p != null && p.id().equals(id))
                .findFirst();
    }

    private static final Pattern SEOUL = Pattern.compile("^(서울특별시|서울시)(\\s|$)");
    private static final List<String> INSTITUTION_FIELDS = List.of("sprvsnInstCdNm", "rgtrInstCdNm", "rgtrUpInstCdNm", "rgtrHghrkInstCdNm");

    /**
     * 서울시(본청·자치구)가 주관하거나 등록한 정책인지. 주관·등록·상위 기관 이름이 "서울특별시"로 시작하면 서울 정책으로 본다.
     * 대상 지역(zipCd)에 서울이 들어 있어도 다른 지역·중앙 부처가 운영하면 빼고,
     * "서울올림픽기념국민체육진흥공단"처럼 이름에 서울만 들어간 기관도 뺀다.
     */
    static boolean isSeoul(JsonNode n) {
        for (String field : INSTITUTION_FIELDS) {
            String v = text(n, field);
            if (v != null && SEOUL.matcher(v).find()) return true;
        }
        return false;
    }

    record Page(int total, List<JsonNode> items) {}

    private Page fetch(Map<String, String> params) {
        long started = System.nanoTime();
        String body;
        try {
            body = restClient.get()
                    .uri(b -> {
                        b.path(PATH)
                                .queryParam("apiKeyNm", apiKey)
                                .queryParam("rtnType", "json");
                        params.forEach(b::queryParam);
                        if (!params.containsKey("pageNum")) b.queryParam("pageNum", 1);
                        return b.build();
                    })
                    .retrieve()
                    .body(String.class);
        } catch (RestClientException e) {
            log.warn("ontong call failed type={} ms={}", e.getClass().getSimpleName(), elapsedMs(started));
            throw new ApiException(ErrorCode.LLM_ERROR, LOAD_FAILED);
        }
        try {
            JsonNode root = objectMapper.readTree(body == null ? "{}" : body);
            int code = root.path("resultCode").asInt(0);
            if (code != 200) {
                log.warn("ontong resultCode={} ms={}", code, elapsedMs(started));
                throw new ApiException(ErrorCode.LLM_ERROR, LOAD_FAILED);
            }
            JsonNode result = root.path("result");
            List<JsonNode> items = new ArrayList<>();
            result.path("youthPolicyList").forEach(items::add);
            int total = result.path("pagging").path("totCount").asInt(items.size());
            log.info("ontong call ok items={} ms={}", items.size(), elapsedMs(started));
            return new Page(total, items);
        } catch (JacksonException e) {
            log.warn("ontong response not json ms={}", elapsedMs(started));
            throw new ApiException(ErrorCode.LLM_ERROR, LOAD_FAILED);
        }
    }

    Program toProgram(JsonNode n, LocalDate today) {
        String plcyNo = text(n, "plcyNo");
        String title = text(n, "plcyNm");
        if (plcyNo == null || title == null) {
            return null;
        }
        String organization = first(text(n, "operInstCdNm"), text(n, "sprvsnInstCdNm"), text(n, "rgtrInstCdNm"));
        String explain = text(n, "plcyExplnCn");
        String support = text(n, "plcySprtCn");
        String etc = text(n, "etcMttrCn");
        String applyMethod = text(n, "plcyAplyMthdCn");
        String documents = text(n, "sbmsnDcmntCn");
        // 활동을 설명하는 문장. 신청 방법 문장은 참여 방식 판단에서 뺀다
        String body = String.join("\n", nz(explain), nz(support), nz(etc), nz(text(n, "bizPrdEtcCn")));

        Category category = NoticeAnalyzer.category(title, text(n, "plcyKywdNm"), body, text(n, "mclsfNm"));
        List<Mode> modes = NoticeAnalyzer.modes(title + "\n" + body);
        Found place = NoticeAnalyzer.place(body, applyMethod, modes, first(text(n, "sprvsnInstCdNm"), text(n, "rgtrInstCdNm")));
        Found supplies = NoticeAnalyzer.supplies(body, applyMethod, documents, modes, category);

        LocalDate[] apply = applyPeriod(text(n, "aplyYmd"));
        LocalDate bizEnd = date(text(n, "bizPrdEndYmd"));
        boolean closed = (apply[1] != null && apply[1].isBefore(today)) || (bizEnd != null && bizEnd.isBefore(today));
        String bizPeriod = period(text(n, "bizPrdBgngYmd"), text(n, "bizPrdEndYmd"), text(n, "bizPrdEtcCn"));
        String eligibility = eligibility(n);
        String contact = phone(String.join("\n", nz(applyMethod), body));
        String applyUrl = url(text(n, "aplyUrlAddr"));
        String sourceUrl = DETAIL_URL + plcyNo;

        StringJoiner notice = new StringJoiner("\n");
        notice.add("[온통청년 청년정책] " + title);
        line(notice, "주관 기관", text(n, "sprvsnInstCdNm"));
        line(notice, "운영 기관", text(n, "operInstCdNm"));
        line(notice, "정책 설명", explain);
        line(notice, "지원 내용", support);
        line(notice, "참여 대상", eligibility);
        line(notice, "사업 기간", bizPeriod);
        line(notice, "신청 기간", text(n, "aplyYmd"));
        line(notice, "신청 방법", applyMethod);
        line(notice, "제출 서류", documents);
        line(notice, "기타", etc);
        // 원문에서 찾은 장소·준비물만 따로 한 줄씩 적는다(추정값은 넣지 않는다)
        line(notice, "장소", place.fromNotice() ? place.value() : null);
        line(notice, "준비물", supplies.fromNotice() ? supplies.value() : null);
        line(notice, "문의", contact);
        line(notice, "신청 사이트", applyUrl);
        line(notice, "원문", sourceUrl);
        String noticeText = notice.toString();
        if (noticeText.length() > NOTICE_MAX) noticeText = noticeText.substring(0, NOTICE_MAX);

        return new Program(
                ID_PREFIX + plcyNo,
                title,
                organization,
                category,
                modes,
                summary(explain),
                apply[0],
                apply[1],
                place.value(),
                false,
                eligibility,
                bizPeriod,
                supplies.value(),
                contact,
                applyUrl,
                sourceUrl,
                noticeText,
                place.fromNotice() ? Program.NOTICE : Program.ESTIMATED,
                supplies.fromNotice() ? Program.NOTICE : Program.ESTIMATED,
                closed);
    }

    private static void line(StringJoiner sj, String label, String value) {
        if (value != null) {
            sj.add(label + ": " + value);
        }
    }

    private static String eligibility(JsonNode n) {
        List<String> parts = new ArrayList<>();
        if ("Y".equals(text(n, "sprtTrgtAgeLmtYn"))) {
            String min = text(n, "sprtTrgtMinAge");
            String max = text(n, "sprtTrgtMaxAge");
            if (min != null && max != null && !"0".equals(max)) {
                parts.add("만 " + min + "~" + max + "세");
            }
        }
        String add = text(n, "addAplyQlfcCndCn");
        if (add != null) parts.add(add);
        String prp = text(n, "ptcpPrpTrgtCn");
        if (prp != null) parts.add("참여 제한: " + prp);
        return parts.isEmpty() ? null : String.join(" / ", parts);
    }

    private static LocalDate[] applyPeriod(String aplyYmd) {
        if (aplyYmd != null) {
            Matcher m = YMD_RANGE.matcher(aplyYmd);
            if (m.find()) {
                return new LocalDate[] {date(m.group(1)), date(m.group(2))};
            }
        }
        return new LocalDate[] {null, null};
    }

    private static String period(String start, String end, String etc) {
        LocalDate s = date(start);
        LocalDate e = date(end);
        String range = s != null && e != null ? s + " ~ " + e : null;
        if (range == null) return etc;
        return etc == null ? range : range + " (" + etc + ")";
    }

    private static LocalDate date(String ymd) {
        if (ymd == null || !ymd.matches("\\d{8}")) return null;
        try {
            return LocalDate.parse(ymd, YMD);
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    private static String summary(String explain) {
        if (explain == null) return null;
        String s = explain.replaceAll("^[\\s\\-○●▸·•]+", "").replaceAll("\\s+", " ").trim();
        return s.length() <= 120 ? s : s.substring(0, 118) + "…";
    }

    private static final Pattern PHONE = Pattern.compile("0\\d{1,2}-\\d{3,4}-\\d{4}");

    private static String phone(String text) {
        Matcher m = PHONE.matcher(text);
        return m.find() ? m.group() : null;
    }

    private static String url(String u) {
        return u != null && (u.startsWith("http://") || u.startsWith("https://")) ? u : null;
    }

    private static String text(JsonNode n, String field) {
        JsonNode v = n.get(field);
        if (v == null || v.isNull()) return null;
        String s = v.asString().trim();
        return s.isEmpty() ? null : s;
    }

    private static String first(String... values) {
        for (String v : values) {
            if (v != null) return v;
        }
        return null;
    }

    private static String nz(String s) {
        return s == null ? "" : s;
    }

    private static long elapsedMs(long startedNanos) {
        return (System.nanoTime() - startedNanos) / 1_000_000;
    }
}
