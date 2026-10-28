package com.onkey.onestep.integration;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import com.onkey.onestep.program.Category;
import com.onkey.onestep.program.Mode;

/**
 * 공고 문장을 규칙으로 읽어 활동 종류·참여 방식·장소·준비물을 고른다(외부 AI 호출 없음, 수천 건을 바로 처리).
 * 장소·준비물은 원문에서 찾으면 {@link Found#fromNotice()} = true, 못 찾으면 일반적인 추정값을 false 로 돌려준다.
 * 추정값은 화면에 "추정"으로 표시하고 사실처럼 쓰지 않는다.
 */
public final class NoticeAnalyzer {

    private NoticeAnalyzer() {}

    /** 값과 출처. fromNotice=false 면 원문에 없어 추정한 값이다. */
    public record Found(String value, boolean fromNotice) {}

    // ── 활동 종류 ────────────────────────────────────────────────

    private static final Map<Category, List<String>> CATEGORY_WORDS = new EnumMap<>(Map.of(
            Category.WORK, List.of("취업", "일자리", "일경험", "직무", "인턴", "창업", "재직", "채용", "면접", "구직", "직업훈련", "자격증", "근로"),
            Category.ART, List.of("예술", "문화", "공연", "전시", "공예", "미술", "음악", "창작", "버스킹", "영화", "사진", "작가"),
            Category.EXERCISE, List.of("운동", "체육", "스포츠", "걷기", "산책", "헬스", "등산", "요가", "러닝", "마라톤", "신체활동"),
            Category.COOKING, List.of("요리", "식사", "반찬", "쿠킹", "살림", "식생활", "먹거리", "밀키트", "식료품", "푸드"),
            Category.TALK, List.of("모임", "커뮤니티", "동아리", "네트워킹", "소통", "멘토링", "자조", "교류", "대화", "친구", "참여단", "위원회"),
            Category.DAILY, List.of("일상", "회복", "고립", "은둔", "마음", "심리", "상담", "건강", "주거", "생활", "돌봄", "월세", "전세")));

    /** 온통청년 중분류 → 활동 종류 가산점 */
    private static final Map<String, Category> MCLSF = Map.ofEntries(
            Map.entry("취업", Category.WORK), Map.entry("창업", Category.WORK), Map.entry("재직자", Category.WORK),
            Map.entry("미래역량강화", Category.WORK), Map.entry("예술인지원", Category.ART), Map.entry("문화활동", Category.ART),
            Map.entry("청년참여", Category.TALK), Map.entry("청년국제교류", Category.TALK), Map.entry("건강", Category.DAILY),
            Map.entry("주택 및 거주지", Category.DAILY), Map.entry("전월세 및 주거급여 지원", Category.DAILY),
            Map.entry("취약계층 및 금융지원", Category.DAILY), Map.entry("문화활동 및 생활지원", Category.DAILY));

    /**
     * 제목(×10, 제목에 낱말이 있으면 거의 그 종류)·키워드(×2)·본문(×1, 낱말마다 한 번)·중분류(+3) 점수가 가장 높은 종류.
     * 같은 점수면 일상 회복 → 대화·모임 → … 순(한걸음 사용자에게 가까운 쪽)으로 고른다.
     */
    public static Category category(String title, String keywords, String body, String mclsf) {
        Map<Category, Integer> score = new EnumMap<>(Category.class);
        for (var e : CATEGORY_WORDS.entrySet()) {
            int s = 0;
            for (String w : e.getValue()) {
                if (has(title, w)) s += 10;
                if (has(keywords, w)) s += 2;
                if (has(body, w)) s += 1;
            }
            score.put(e.getKey(), s);
        }
        if (mclsf != null) {
            for (String part : mclsf.split(",")) {
                Category c = MCLSF.get(part.trim());
                if (c != null) score.merge(c, 3, Integer::sum);
            }
        }
        Category best = Category.DAILY;
        int bestScore = 0;
        for (Category c : List.of(Category.DAILY, Category.TALK, Category.COOKING, Category.EXERCISE, Category.ART, Category.WORK)) {
            if (score.get(c) > bestScore) {
                best = c;
                bestScore = score.get(c);
            }
        }
        return best;
    }

    // ── 참여 방식 ────────────────────────────────────────────────

    /** "온라인 신청"처럼 신청 방법을 말하는 표현은 참여 방식이 아니므로 지운다. */
    private static final Pattern APPLY_WORDS = Pattern.compile("(온라인|오프라인|방문|비대면|우편|이메일|전화)\\s*(신청|접수|제출)");
    private static final Pattern ONLINE = Pattern.compile("온라인|비대면|화상|zoom|줌\\s|유튜브|웹\\s?세미나|라이브\\s?방송|e-?러닝|원격");
    private static final Pattern OFFLINE = Pattern.compile("(?<!비)대면|오프라인|현장|센터에서|교육장|집합|체험|견학|방문\\s*(상담|교육|프로그램)|장소\\s*[:：]|에서\\s*진행");
    private static final Pattern GROUP = Pattern.compile("모임|집단|그룹|동아리|팀\\s|팀별|함께|네트워킹|커뮤니티|워크숍|캠프|행사|축제|페스티벌|자조|또래|단체|파티");
    private static final Pattern SOLO = Pattern.compile("1\\s?:\\s?1|1대1|일대일|개별|개인\\s?맞춤|혼자|1인");
    /** 돈·대출·수당처럼 어디 가서 하는 활동이 아닌 지원 */
    private static final Pattern CASH = Pattern.compile("지원금|대출|이자|보조금|수당|적금|바우처|감면|환급|장려금|월세\\s*지원|주거비|급여|교통비|축하금|지급|할인|보험료|장학금");

    /** 활동을 설명하는 문장(설명·지원 내용)에서만 고른다. 신청 방법 문장은 보지 않는다. */
    public static List<Mode> modes(String body) {
        String t = APPLY_WORDS.matcher(body.toLowerCase(Locale.ROOT)).replaceAll(" ");
        List<Mode> modes = new ArrayList<>();
        if (OFFLINE.matcher(t).find()) modes.add(Mode.OFFLINE);
        if (ONLINE.matcher(t).find()) modes.add(Mode.ONLINE);
        if (GROUP.matcher(t).find()) modes.add(Mode.GROUP);
        if (SOLO.matcher(t).find()) modes.add(Mode.SOLO);
        // 단서가 없고 돈·서비스 지원도 아니면, 기관에 가서 하는 활동으로 본다
        if (modes.isEmpty() && !CASH.matcher(t).find()) modes.add(Mode.OFFLINE);
        return modes;
    }

    public static boolean isCashSupport(String body) {
        return CASH.matcher(body).find();
    }

    // ── 장소 ────────────────────────────────────────────────────

    private static final Pattern PLACE_LABEL = Pattern.compile(
            "(?:운영|교육|활동|상담|대여|행사|사업|진행)?\\s*(?:장소|위치|소재지)\\s*[:：]\\s*([^\\n/※]{2,80})");
    private static final Pattern ADDRESS = Pattern.compile(
            "((?:[가-힣]+(?:특별시|광역시|특별자치시|특별자치도|도)\\s)?[가-힣]+[시군구]\\s[가-힣0-9]+(?:로|길)\\s?\\d+(?:-\\d+)?(?:번길\\s?\\d+)?)");
    private static final Pattern PLACE_NAME = Pattern.compile(
            "((?:[가-힣]+(?:특별시|광역시|특별자치시|특별자치도|도|시|군|구)\\s)?[가-힣A-Za-z0-9·]{1,20}(?:청년센터|청년공간|미래센터|청년마루|복지관|문화센터|도서관|행정복지센터|주민센터|구청|시청|군청|보건소|정신건강복지센터|일자리센터|고용센터))");

    /**
     * 장소: "장소: …" 같은 줄 → 도로명 주소 → 기관·시설 이름 순으로 원문에서 찾는다.
     * 못 찾으면 온라인 전용은 "온라인(집에서 참여)", 그 밖에는 주관 기관의 지역으로 추정한다(부서 이름은 장소가 아니라 쓰지 않는다).
     */
    public static Found place(String body, String applyMethod, List<Mode> modes, String institution) {
        for (String text : new String[] {body, applyMethod}) {
            if (text == null) continue;
            Matcher m = PLACE_LABEL.matcher(text);
            if (m.find()) return new Found(clean(m.group(1)), true);
        }
        for (String text : new String[] {body, applyMethod}) {
            if (text == null) continue;
            Matcher m = ADDRESS.matcher(text);
            if (m.find()) return new Found(clean(m.group(1)), true);
            m = PLACE_NAME.matcher(text);
            if (m.find()) return new Found(clean(m.group(1)), true);
        }
        if (modes.contains(Mode.ONLINE) && !modes.contains(Mode.OFFLINE)) {
            return new Found("온라인(집에서 참여)", false);
        }
        String region = region(institution);
        return new Found(region == null ? "운영 기관이 안내하는 장소" : region + " 안 운영 기관", false);
    }

    // ── 준비물 ───────────────────────────────────────────────────

    private static final Pattern SUPPLIES_LABEL = Pattern.compile("준비물\\s*[:：]?\\s*\\n?\\s*[·\\-○•▸]?\\s*([^\\n※]{2,80})");
    private static final Pattern BRING = Pattern.compile("([가-힣A-Za-z0-9·\\s]{2,20}?)\\s*(?:을|를)?\\s*지참");
    /** 내용이 없는 제출 서류 칸("-", "해당 없음", "공고문 참조" 등) */
    private static final Pattern EMPTY_DOCS = Pattern.compile("^[\\s\\-·.]*$|해당\\s*(사항\\s*)?없음|^없음|참조|참고|추후|예정|별도\\s*공지");

    /**
     * 준비물: "준비물: …" → "…지참" → 제출 서류 순으로 원문에서 찾는다.
     * 못 찾으면 참여 방식·활동 종류에 맞는 일반적인 준비물로 추정한다.
     */
    public static Found supplies(String body, String applyMethod, String documents, List<Mode> modes, Category category) {
        for (String text : new String[] {body, applyMethod}) {
            if (text == null) continue;
            Matcher m = SUPPLIES_LABEL.matcher(text);
            if (m.find()) return new Found(clean(m.group(1)), true);
        }
        for (String text : new String[] {body, applyMethod}) {
            if (text == null) continue;
            Matcher m = BRING.matcher(text);
            if (m.find()) {
                String v = clean(m.group(1).replaceAll("^[\\s,·-]+", ""));
                if (v.length() >= 2 && !v.equals("서류")) return new Found(v, true);
            }
        }
        if (documents != null && !EMPTY_DOCS.matcher(documents).find()) {
            return new Found("신청 서류: " + clean(documents.replaceAll("\\s+", " ")), true);
        }
        List<String> guess = new ArrayList<>();
        if (modes.contains(Mode.ONLINE) && !modes.contains(Mode.OFFLINE)) {
            guess.add("휴대폰이나 컴퓨터");
            guess.add("이어폰");
        } else {
            guess.add("신분증");
            guess.add("휴대폰");
        }
        if (category == Category.EXERCISE) guess.add("편한 옷과 운동화");
        if (category == Category.COOKING) guess.add("앞치마(있다면)");
        if (category == Category.ART) guess.add("필기구");
        return new Found(String.join(", ", guess), false);
    }

    // ── 공통 ────────────────────────────────────────────────────

    private static final Pattern REGION = Pattern.compile(
            "^([가-힣]+(?:특별시|광역시|특별자치시|특별자치도|도))(?=\\s|$)(?:\\s([가-힣]+[시군구])(?=\\s|$))?|^([가-힣]+[시군구])(?=\\s|$)");

    /** "전북특별자치도 장수군 농업기술센터" → "전북특별자치도 장수군". 중앙 부처처럼 지역이 없으면 null. */
    static String region(String institution) {
        if (institution == null) return null;
        Matcher m = REGION.matcher(institution.trim());
        if (!m.find()) return null;
        if (m.group(3) != null) return m.group(3);
        return m.group(2) == null ? m.group(1) : m.group(1) + " " + m.group(2);
    }

    private static boolean has(String text, String word) {
        return text != null && text.contains(word);
    }

    private static String clean(String s) {
        String v = s.replaceAll("\\s+", " ").replaceAll("[\\s,.·]+$", "").trim();
        return v.length() <= 80 ? v : v.substring(0, 78) + "…";
    }
}
