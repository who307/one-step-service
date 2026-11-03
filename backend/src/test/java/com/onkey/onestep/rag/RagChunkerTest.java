package com.onkey.onestep.rag;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

class RagChunkerTest {
    private final RagChunker chunker = new RagChunker();

    @Test
    void keepsEligibilityAndExceptionsTogetherWithTitle() {
        List<RagChunker.Chunk> chunks = chunker.split(source("""
                ## 참여 대상
                만 19~39세. 단, 이미 지원받은 사람은 제외합니다.

                ## 제출 서류
                임대차계약서와 주민등록등본
                """));
        assertThat(chunks).hasSize(2);
        assertThat(chunks.getFirst().section()).isEqualTo("참여 대상");
        assertThat(chunks.getFirst().content()).contains("공고: 테스트 월세 공고", "만 19~39세", "이미 지원받은 사람은 제외");
        assertThat(chunks.get(1).section()).isEqualTo("제출 서류");
        assertThat(chunks.get(1).content()).contains("임대차계약서");
    }

    @Test
    void longSectionPreservesEveryCharacterAndTail() {
        String body = "가".repeat(1700) + "중간필수조건🙂" + "나".repeat(3300) + "마지막 제외 조건";
        List<RagChunker.Chunk> chunks = chunker.split(source("## 지원 내용\n" + body));
        assertThat(chunks.size()).isGreaterThan(3);
        assertThat(chunks).allSatisfy(c -> {
            assertThat(c.section()).isEqualTo("지원 내용");
            assertThat(c.content()).startsWith("공고: 테스트 월세 공고\n항목: 지원 내용\n");
            assertThat(c.content()).doesNotContain("\uFFFD");
        });
        assertThat(chunks.getLast().content()).endsWith("마지막 제외 조건");
        // Every distinct source window occurs in at least one chunk, including boundaries.
        for (int i = 0; i < body.length() - 30; i += 10) {
            String window = body.substring(i, i + 30);
            assertThat(chunks.stream().anyMatch(c -> c.content().contains(window))).isTrue();
        }
    }

    @Test
    void emptySectionDoesNotGenerateEvidence() {
        assertThat(chunker.split(source("## 제출 서류\n\n## 신청 기간\n상시")))
                .extracting(RagChunker.Chunk::section).containsExactly("신청 기간");
        assertThat(chunker.split(source("   "))).isEmpty();
    }

    private static RagSourceDocument source(String text) {
        return new RagSourceDocument("ontong-1", "테스트 월세 공고", "https://example.test", "{}", text);
    }
}
