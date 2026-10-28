package com.onkey.onestep.integration;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.onkey.onestep.integration.NoticeAnalyzer.Found;
import com.onkey.onestep.program.Category;
import com.onkey.onestep.program.Mode;

class NoticeAnalyzerTest {

    @Test
    void categoryFollowsTitleAndClassification() {
        assertThat(NoticeAnalyzer.category("청년 취업 면접 정장 대여", null, "", "취업")).isEqualTo(Category.WORK);
        assertThat(NoticeAnalyzer.category("청년 버스킹 공연 지원", null, "공연장비 대여", "문화활동")).isEqualTo(Category.ART);
        assertThat(NoticeAnalyzer.category("1인가구 요리 교실", null, "함께 반찬 만들기", null)).isEqualTo(Category.COOKING);
        assertThat(NoticeAnalyzer.category("청년 러닝 크루", null, "주 1회 함께 달리기 운동", null)).isEqualTo(Category.EXERCISE);
        assertThat(NoticeAnalyzer.category("청년 커뮤니티 모임 지원", null, "", "청년참여")).isEqualTo(Category.TALK);
        assertThat(NoticeAnalyzer.category("무언가", null, "", null)).isEqualTo(Category.DAILY);
    }

    @Test
    void modesIgnoreApplicationMethodWords() {
        assertThat(NoticeAnalyzer.modes("온라인 신청 후 센터에서 진행하는 소규모 모임")).containsExactly(Mode.OFFLINE, Mode.GROUP);
        assertThat(NoticeAnalyzer.modes("비대면 화상 상담 1:1 진행")).containsExactly(Mode.ONLINE, Mode.SOLO);
        // 돈 지원은 어디 가서 하는 활동이 아니다
        assertThat(NoticeAnalyzer.modes("월 20만원 월세 지원금 지급")).isEmpty();
    }

    @Test
    void placeFromLabelAddressOrEstimate() {
        assertThat(NoticeAnalyzer.place("○ 운영장소 : 청춘이랑 1층(북구 자미로66번길 55)\n○ 내용", null, List.of(Mode.OFFLINE), "북구"))
                .isEqualTo(new Found("청춘이랑 1층(북구 자미로66번길 55)", true));
        assertThat(NoticeAnalyzer.place("교육은 중구 서성로20길 25 에서 열려요", null, List.of(), null).value())
                .isEqualTo("중구 서성로20길 25");
        assertThat(NoticeAnalyzer.place("온라인 강의", null, List.of(Mode.ONLINE), "OO재단"))
                .isEqualTo(new Found("온라인(집에서 참여)", false));
        assertThat(NoticeAnalyzer.place("내용 없음", null, List.of(Mode.OFFLINE), "전북특별자치도 장수군 농업기술센터"))
                .isEqualTo(new Found("전북특별자치도 장수군 안 운영 기관", false));
        assertThat(NoticeAnalyzer.place("내용 없음", null, List.of(Mode.OFFLINE), "보건복지부"))
                .isEqualTo(new Found("운영 기관이 안내하는 장소", false));
    }

    @Test
    void regionFromInstitution() {
        assertThat(NoticeAnalyzer.region("서울특별시 미래청년기획관 청년사업담당관")).isEqualTo("서울특별시");
        assertThat(NoticeAnalyzer.region("경기도 용인시")).isEqualTo("경기도 용인시");
        assertThat(NoticeAnalyzer.region("부산진구")).isEqualTo("부산진구");
        assertThat(NoticeAnalyzer.region("국무조정실")).isNull();
    }

    @Test
    void emptyDocumentsAreNotSupplies() {
        Found f = NoticeAnalyzer.supplies("", null, "해당 없음", List.of(Mode.OFFLINE), Category.DAILY);
        assertThat(f.fromNotice()).isFalse();
    }

    @Test
    void suppliesFromLabelBringOrDocumentsOrEstimate() {
        assertThat(NoticeAnalyzer.supplies("○ 준비물\n· 활동하기 편한 복장과 운동화\n○ 신청", null, null, List.of(), Category.TALK))
                .isEqualTo(new Found("활동하기 편한 복장과 운동화", true));
        Found bring = NoticeAnalyzer.supplies("", "※ 실물 신분증 지참 필요", null, List.of(), Category.WORK);
        assertThat(bring.fromNotice()).isTrue();
        assertThat(bring.value()).endsWith("실물 신분증");
        assertThat(NoticeAnalyzer.supplies("", null, "주민등록등본 1부", List.of(), Category.DAILY))
                .isEqualTo(new Found("신청 서류: 주민등록등본 1부", true));
        Found guess = NoticeAnalyzer.supplies("", null, null, List.of(Mode.OFFLINE), Category.EXERCISE);
        assertThat(guess.fromNotice()).isFalse();
        assertThat(guess.value()).contains("신분증").contains("운동화");
    }
}
