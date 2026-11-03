package com.onkey.onestep.integration;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;

import com.onkey.onestep.common.AppProperties;
import com.onkey.onestep.common.NoticeValidator;
import com.onkey.onestep.program.Category;
import com.onkey.onestep.program.Mode;
import com.onkey.onestep.program.Program;
import com.onkey.onestep.rag.RagSourceDocument;

import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

/** 온통청년 응답 한 건 → Program 변환(네트워크 호출 없음). */
class OntongYouthProgramProviderTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 28);

    private final ObjectMapper mapper = JsonMapper.builder().build();
    private final OntongYouthProgramProvider provider = new OntongYouthProgramProvider(
            new AppProperties(null, new AppProperties.YouthCenter(true, "https://example.invalid", "test-key"), null), mapper);

    private static final String ITEM = """
            {"plcyNo":"20261028005400214463","plcyNm":"고립·은둔청년 지원사업","plcyKywdNm":"맞춤형상담서비스",
             "plcyExplnCn":"-고립·은둔청년의 고립도 기반 맞춤형 회복지원과 직무·일경험 프로그램을 통한 자립역량 강화",
             "plcySprtCn":"0단계 고요: 초기접촉·신뢰형성\\n1단계: 1:1 초기상담\\n2단계 남실바람: 소규모 자조모임, 또래 멘토링 및 공동활동",
             "sprvsnInstCdNm":"제주특별자치도","operInstCdNm":"","mclsfNm":"취약계층 및 금융지원",
             "aplyYmd":"20261012 ~ 20261231","bizPrdBgngYmd":"20261012","bizPrdEndYmd":"20261231","bizPrdEtcCn":"",
             "plcyAplyMthdCn":"온라인신청: 보건복지부 청년ON누리집\\n오프라인신청: 제주특별자치도 청년미래센터 온바람 유선 및 방문신청 (064-724-3330)",
             "aplyUrlAddr":"https://www.mohw2030.co.kr/panel.asp","sbmsnDcmntCn":"",
             "sprtTrgtMinAge":"19","sprtTrgtMaxAge":"39","sprtTrgtAgeLmtYn":"Y","addAplyQlfcCndCn":"","ptcpPrpTrgtCn":""}
            """;

    @Test
    void mapsPolicyToProgram() {
        Program p = provider.toProgram(mapper.readTree(ITEM), TODAY);

        assertThat(p.id()).isEqualTo("ontong-20261028005400214463");
        assertThat(p.title()).isEqualTo("고립·은둔청년 지원사업");
        assertThat(p.organization()).isEqualTo("제주특별자치도");
        assertThat(p.isSample()).isFalse();
        assertThat(p.closed()).isFalse();
        assertThat(p.applicationStart()).isEqualTo(LocalDate.of(2026, 10, 12));
        assertThat(p.applicationEnd()).isEqualTo(LocalDate.of(2026, 12, 31));
        assertThat(p.eligibility()).isEqualTo("만 19~39세");
        assertThat(p.contact()).isEqualTo("064-724-3330");
        assertThat(p.applicationUrl()).isEqualTo("https://www.mohw2030.co.kr/panel.asp");
        assertThat(p.sourceUrl()).endsWith("20261028005400214463");
        assertThat(p.category()).isEqualTo(Category.DAILY);
        // "온라인신청"은 신청 방법이라 참여 방식(온라인)으로 보지 않는다
        assertThat(p.modes()).contains(Mode.GROUP, Mode.SOLO).doesNotContain(Mode.ONLINE);
        // 장소: 신청 방법 문장의 기관 이름을 원문에서 찾음
        assertThat(p.location()).isEqualTo("제주특별자치도 청년미래센터");
        assertThat(p.locationSource()).isEqualTo(Program.NOTICE);
        // 준비물: 원문에 없어 추정
        assertThat(p.supplies()).contains("신분증");
        assertThat(p.suppliesSource()).isEqualTo(Program.ESTIMATED);
    }

    @Test
    void endedPolicyIsClosed() {
        Program p = provider.toProgram(mapper.readTree(ITEM), LocalDate.of(2027, 1, 5));
        assertThat(p.closed()).isTrue();
    }

    @Test
    void noticeTextIsQuotableAndPassesNoticeCheck() {
        Program p = provider.toProgram(mapper.readTree(ITEM), TODAY);

        assertThat(p.noticeText()).contains("참여 대상: 만 19~39세").contains("신청 기간: 20261012 ~ 20261231")
                .contains("장소: 제주특별자치도 청년미래센터")
                .doesNotContain("준비물:");
        assertThat(p.noticeText().length()).isBetween(100, 4000);
        assertThat(new NoticeValidator().isNotice(p.noticeText())).isTrue();
    }

    @Test
    void onlySeoulPoliciesCount() {
        assertThat(OntongYouthProgramProvider.isSeoul(mapper.readTree("""
                {"sprvsnInstCdNm":"서울특별시 미래청년기획관 청년사업담당관"}"""))).isTrue();
        assertThat(OntongYouthProgramProvider.isSeoul(mapper.readTree("""
                {"sprvsnInstCdNm":"은평구","rgtrHghrkInstCdNm":"서울특별시"}"""))).isTrue();
        // 대상 지역에 서울이 있어도 다른 지역이 운영하면 제외
        assertThat(OntongYouthProgramProvider.isSeoul(mapper.readTree("""
                {"sprvsnInstCdNm":"전남광주통합특별시 장흥군","zipCd":"11110,11140"}"""))).isFalse();
        // 이름에 '서울'만 들어간 중앙 기관은 제외
        assertThat(OntongYouthProgramProvider.isSeoul(mapper.readTree("""
                {"sprvsnInstCdNm":"문화체육관광부","rgtrInstCdNm":"서울올림픽기념국민체육진흥공단"}"""))).isFalse();
        assertThat(OntongYouthProgramProvider.isSeoul(mapper.readTree(ITEM))).isFalse();
    }

    @Test
    void foreignIdIsNotFoundWithoutNetwork() {
        assertThat(provider.findById("sample-thursday-table")).isEmpty();
        assertThat(provider.findById("ontong-abc")).isEmpty();
        assertThat(provider.fetchRagDocument("sample-thursday-table")).isEmpty();
        assertThat(provider.fetchRagDocument("ontong-abc")).isEmpty();
    }

    @Test
    void ragSourceIsUncappedAndContainsNoInferredFields() {
        var source = mapper.createObjectNode();
        source.put("plcyNo", "123");
        source.put("plcyNm", "긴 청년 정책");
        source.put("plcySprtCn", "지원 설명 ".repeat(1200) + "마지막 필수 조건");
        source.put("sprtTrgtAgeLmtYn", "Y");
        source.put("sprtTrgtMinAge", "19");
        source.put("sprtTrgtMaxAge", "39");
        source.put("ptcpPrpTrgtCn", "이미 지원받은 사람은 제외");
        RagSourceDocument document = provider.toRagDocument(source);

        assertThat(document.programId()).isEqualTo("ontong-123");
        assertThat(document.content().length()).isGreaterThan(4000);
        assertThat(document.content()).contains("마지막 필수 조건", "참여 제한: 이미 지원받은 사람은 제외")
                .doesNotContain("신분증", "휴대폰", "## 장소", "## 준비물");
        assertThat(mapper.readTree(document.rawJson()).path("plcySprtCn").asString())
                .endsWith("마지막 필수 조건");
    }
}
