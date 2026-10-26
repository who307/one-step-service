// 앞 글자 받침에 맞춰 조사를 고른다. 공고 이름처럼 미리 알 수 없는 단어 뒤에 쓴다.

function lastHangul(word: string) {
  // 따옴표·괄호 같은 끝 기호는 건너뛴다
  const trimmed = word.replace(/[\s'"’”)\]]+$/, "");
  return trimmed.charCodeAt(trimmed.length - 1) - 0xac00;
}

export function hasBatchim(word: string) {
  const code = lastHangul(word);
  if (code < 0 || code > 11171) return false; // 한글이 아니면 받침 없음으로 본다
  return code % 28 !== 0;
}

type Pair = "을/를" | "은/는" | "이/가" | "이라고/라고";

export function josa(word: string, pair: Pair) {
  const [withB, withoutB] = pair.split("/");
  return `${word}${hasBatchim(word) ? withB : withoutB}`;
}
