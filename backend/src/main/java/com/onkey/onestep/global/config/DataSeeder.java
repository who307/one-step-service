package com.onkey.onestep.global.config;

import static com.onkey.onestep.program.domain.FactStatus.CONFIRMED;
import static com.onkey.onestep.program.domain.FactStatus.UNCONFIRMED;

import com.onkey.onestep.practice.domain.Scene;
import com.onkey.onestep.practice.repository.SceneRepository;
import com.onkey.onestep.program.domain.Location;
import com.onkey.onestep.program.domain.Program;
import com.onkey.onestep.program.domain.ProgramFact;
import com.onkey.onestep.program.domain.ProgramSource;
import com.onkey.onestep.program.repository.ProgramRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** 빈 DB에 시연용 공식 공고 1건(따뜻한 집)과 연습 장면을 넣는다. 데이터가 있으면 건너뛴다. */
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final ProgramRepository programRepository;
    private final SceneRepository sceneRepository;

    @Override
    @Transactional
    public void run(String... args) {
        if (programRepository.count() == 0) seedPrograms();
        if (sceneRepository.count() == 0) seedScenes();
    }

    private void seedPrograms() {
        var warmHouse = Program.builder()
                .id("warm-house-2026-11")
                .title("따뜻한 집")
                .organization("서울청년기지개센터")
                .summary("서울청년기지개센터 프로그램 목록에 등록된 오프라인 활동입니다.")
                .interests(Set.of("daily", "cooking"))
                .modes(Set.of("offline", "group"))
                .knownBurdens(Set.of())
                .location(new Location("신길종합사회복지관", "서울 영등포구 신길동", 37.5047, 126.9165))
                .sourceUrl("https://www.siryc.or.kr/user/index.asp")
                .sourceCheckedAt(LocalDate.of(2026, 10, 25))
                .applyUrl("https://www.siryc.or.kr/user/index.asp")
                .source(ProgramSource.MANUAL)
                .build();
        int i = 0;
        warmHouse.addFact(new ProgramFact("applyPeriod", "접수 기간", "2026.10.16 ~ 11.18", CONFIRMED, "마감 시각은 확인 필요", i++));
        warmHouse.addFact(new ProgramFact("activityDate", "활동 날짜", "2026.11.19", CONFIRMED, "시작·종료 시각은 확인 필요", i++));
        warmHouse.addFact(new ProgramFact("place", "장소", "신길종합사회복지관 3층 성장교실 2", CONFIRMED, null, i++));
        warmHouse.addFact(new ProgramFact("target", "참여 대상", null, UNCONFIRMED, null, i++));
        warmHouse.addFact(new ProgramFact("selection", "선정 조건", null, UNCONFIRMED, null, i++));
        warmHouse.addFact(new ProgramFact("cost", "비용", null, UNCONFIRMED, null, i++));
        warmHouse.addFact(new ProgramFact("supplies", "준비물", null, UNCONFIRMED, null, i++));
        warmHouse.addFact(new ProgramFact("schedule", "세부 순서", null, UNCONFIRMED, null, i));
        programRepository.save(warmHouse);

        seedSamplePrograms();
    }

    // ── 예시 공고: 기관·장소·일정 모두 지어낸 것. 프론트 mocks/programs.ts 와 같은 내용 ──

    private record F(String key, String label, String value, String note) {
        static F of(String key, String label, String value) { return new F(key, label, value, null); }
        static F of(String key, String label, String value, String note) { return new F(key, label, value, note); }
    }

    private void sample(String id, String title, String org, String summary, Set<String> interests, Set<String> modes,
                        Set<String> burdens, Location location, F... facts) {
        var p = Program.builder()
                .id(id).sample(true).title(title).organization(org).summary(summary)
                .interests(interests).modes(modes).knownBurdens(burdens).location(location)
                .sourceUrl("#").sourceCheckedAt(LocalDate.of(2026, 10, 26)).source(ProgramSource.MANUAL)
                .build();
        for (int i = 0; i < facts.length; i++) {
            var f = facts[i];
            p.addFact(new ProgramFact(f.key(), f.label(), f.value(), f.value() == null ? UNCONFIRMED : CONFIRMED, f.note(), i));
        }
        programRepository.save(p);
    }

    private void seedSamplePrograms() {
        sample("sample-thursday-table", "같이 밥 먹는 목요일", "다온청년공간",
                "매주 목요일 저녁, 정해진 메뉴를 함께 만들고 먹어요. 말을 많이 하지 않아도 괜찮은 자리예요.",
                Set.of("cooking", "daily"), Set.of("offline", "group"), Set.of(),
                new Location("다온청년공간", "서울 마포구 망원동", 37.5559, 126.9019),
                F.of("applyPeriod", "접수 기간", "2026.10.20 ~ 11.09", "선착순 마감"),
                F.of("activityDate", "활동 날짜", "2026.11.12 ~ 12.17 매주 목요일", "18:30 ~ 20:30, 총 6회"),
                F.of("place", "장소", "다온청년공간 2층 공유주방"),
                F.of("target", "참여 대상", "서울에 사는 19~39세 청년"),
                F.of("selection", "선정 조건", "선착순 8명"),
                F.of("cost", "비용", "무료"),
                F.of("supplies", "준비물", "없음", "앞치마는 공간에서 빌려줘요"),
                F.of("schedule", "세부 순서", "인사 10분 → 요리 60분 → 함께 식사 40분 → 정리 10분"));

        sample("sample-slow-walk", "천천히 걷는 토요일 산책", "한빛청년센터",
                "하천을 따라 한 시간 정도 천천히 걸어요. 함께 걷되 대화는 하고 싶은 만큼만 해요.",
                Set.of("exercise", "daily"), Set.of("offline", "group"), Set.of(),
                new Location("성북천 분수광장", "서울 성북구 동선동", 37.5893, 127.0177),
                F.of("applyPeriod", "접수 기간", "2026.11.02 ~ 11.19"),
                F.of("activityDate", "활동 날짜", "2026.11.21 토요일", "10:00 집결, 11:30 해산"),
                F.of("place", "모이는 곳", "성북천 분수광장 앞"),
                F.of("target", "참여 대상", null),
                F.of("selection", "선정 조건", "신청 순서대로 12명"),
                F.of("cost", "비용", "무료"),
                F.of("supplies", "준비물", "편한 운동화, 물"),
                F.of("schedule", "세부 순서", null));

        sample("sample-morning-routine", "온라인 아침 루틴 4주", "마음잇기 청년지원단",
                "매일 아침 일어난 시간을 사진 한 장으로 남겨요. 영상 통화나 발표는 없어요.",
                Set.of("daily"), Set.of("online", "solo"), Set.of("documents"), null,
                F.of("applyPeriod", "접수 기간", "2026.10.26 ~ 11.13"),
                F.of("activityDate", "활동 기간", "2026.11.16 ~ 12.11", "평일만, 4주"),
                F.of("place", "장소", "온라인 (단체 채팅방)"),
                F.of("target", "참여 대상", "19~39세 청년, 지역 제한 없음"),
                F.of("selection", "선정 조건", "간단한 신청서 제출", "자기소개 3줄"),
                F.of("cost", "비용", "무료"),
                F.of("supplies", "준비물", "스마트폰"),
                F.of("schedule", "세부 순서", null));

        sample("sample-bookcafe-staff", "작은 일경험: 북카페 사흘 스태프", "청년책방 쉼표",
                "북카페에서 책 정리와 음료 준비를 사흘간 함께해요. 손님 응대는 원하는 만큼만 맡아요.",
                Set.of("work"), Set.of("offline", "group"), Set.of("selection", "documents"),
                new Location("청년책방 쉼표", "서울 은평구 응암동", 37.5989, 126.9156),
                F.of("applyPeriod", "접수 기간", "2026.11.03 ~ 11.20"),
                F.of("activityDate", "활동 날짜", "2026.12.03 ~ 12.05", "13:00 ~ 17:00"),
                F.of("place", "장소", "청년책방 쉼표"),
                F.of("target", "참여 대상", "서울에 사는 19~34세 청년"),
                F.of("selection", "선정 조건", "신청서 검토 후 짧은 전화 면담", "4명 선발"),
                F.of("cost", "비용", "무료"),
                F.of("supplies", "준비물", null),
                F.of("schedule", "세부 순서", "첫날 오리엔테이션 30분 후 업무 시작"));

        sample("sample-pottery-day", "손으로 빚는 컵 하나, 도자기 원데이", "흙과손 공방",
                "두 시간 동안 내 컵 하나를 만들어요. 완성품은 3주 뒤 집으로 보내줘요.",
                Set.of("art"), Set.of("offline", "group"), Set.of("cost"),
                new Location("흙과손 공방", "서울 종로구 창신동", 37.5763, 127.0128),
                F.of("applyPeriod", "접수 기간", "2026.11.01 ~ 11.24"),
                F.of("activityDate", "활동 날짜", "2026.11.28 토요일", "14:00 ~ 16:00"),
                F.of("place", "장소", "흙과손 공방 1층 작업실"),
                F.of("target", "참여 대상", "서울에 사는 19~39세 청년"),
                F.of("selection", "선정 조건", "선착순 6명"),
                F.of("cost", "비용", "재료비 10,000원", "현장 결제"),
                F.of("supplies", "준비물", "더러워져도 되는 옷"),
                F.of("schedule", "세부 순서", null));

        sample("sample-talk-circle", "카메라 끄고 하는 말하기 모임", "마음잇기 청년지원단",
                "카메라 없이 목소리나 채팅으로 참여하는 온라인 소모임이에요. 매회 짧은 주제 하나로 이야기해요.",
                Set.of("talk"), Set.of("online", "group"), Set.of("selection"), null,
                F.of("applyPeriod", "접수 기간", "2026.10.28 ~ 11.15"),
                F.of("activityDate", "활동 날짜", "2026.11.18 ~ 12.09 매주 수요일", "20:00 ~ 21:00, 총 4회"),
                F.of("place", "장소", "온라인 (화상회의, 카메라 선택)"),
                F.of("target", "참여 대상", "19~39세 청년"),
                F.of("selection", "선정 조건", "신청서 검토 후 8명 선정"),
                F.of("cost", "비용", "무료"),
                F.of("supplies", "준비물", "이어폰"),
                F.of("schedule", "세부 순서", "인사 → 오늘의 주제 → 돌아가며 한마디 → 마무리"));

        sample("sample-drawing-kit", "집에서 하는 그림일기 키트", "다온청년공간",
                "그림일기 키트를 집으로 보내드려요. 2주 동안 하루 한 장씩 그리고, 원하면 사진으로 공유해요.",
                Set.of("art", "daily"), Set.of("solo", "online"), Set.of("documents"), null,
                F.of("applyPeriod", "접수 기간", "2026.11.05 ~ 11.26", "키트 소진 시 마감"),
                F.of("activityDate", "활동 기간", "키트 받은 날부터 2주"),
                F.of("place", "장소", "집 (택배 발송)"),
                F.of("target", "참여 대상", "서울에 사는 19~39세 청년"),
                F.of("selection", "선정 조건", "선착순 30명", "배송 주소 필요"),
                F.of("cost", "비용", "무료"),
                F.of("supplies", "준비물", "없음", "필기구 포함"),
                F.of("schedule", "세부 순서", null));
    }

    private void seedScenes() {
        sceneRepository.saveAll(List.of(
                new Scene("first-greeting", "도착해서 첫 인사", "접수처에서 이름을 말하고 인사하는 장면",
                        "안녕하세요, 오늘 프로그램 신청한 ○○○입니다.", "firstWords",
                        "당신은 복지관 접수처의 친절한 직원이다. 참가자를 맞이하고 이름을 묻는다.", 0),
                new Scene("ask-place", "장소를 못 찾을 때 묻기", "건물 안에서 교실 위치를 물어보는 장면",
                        "혹시 3층 성장교실이 어디인지 알 수 있을까요?", "route",
                        "당신은 건물 1층 안내데스크 직원이다. 길을 묻는 사람에게 차분히 안내한다.", 1),
                new Scene("ask-help", "잘 모를 때 도움 요청", "활동 중 이해가 안 되는 부분을 묻는 장면",
                        "죄송한데, 방금 말씀하신 부분을 한 번만 더 알려주실 수 있나요?", "askHelp",
                        "당신은 프로그램 진행자다. 질문을 반기고 다시 설명해 준다.", 2),
                new Scene("self-intro", "짧은 자기소개", "여러 사람 앞에서 이름과 한 마디를 말하는 장면",
                        "안녕하세요, ○○○이라고 합니다. 오늘 잘 부탁드려요.", "crowd",
                        "당신은 첫 모임 진행자다. 짧은 자기소개를 부드럽게 이끈다.", 3)
        ));
    }
}
