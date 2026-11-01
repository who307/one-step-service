// 첫 방문 안내서를 본 적이 있는지. 이 브라우저의 localStorage에 남긴다.
// 저장소를 쓸 수 없으면(사생활 보호 창 등) 이번 이용 동안만 기억해, 안내서와 홈 사이를 오가며 갇히지 않게 한다.

const KEY = "onestep:guide-seen";
let seenThisVisit = false;

export function hasSeenGuide(): boolean {
  if (seenThisVisit) return true;
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function markGuideSeen() {
  seenThisVisit = true;
  try {
    window.localStorage.setItem(KEY, "1");
  } catch {
    // 저장하지 못해도 이번 이용 동안은 다시 열지 않는다
  }
}
