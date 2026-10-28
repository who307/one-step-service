package com.onkey.onestep;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;

import com.onkey.onestep.integration.AiConversationProvider;
import com.onkey.onestep.integration.GeminiConversationProvider;
import com.onkey.onestep.integration.OntongYouthProgramProvider;
import com.onkey.onestep.integration.ProgramProvider;

/** enabled=true 이면 실제 연동 구현이 단독으로 활성화되는지 확인(네트워크 호출 없음). */
@SpringBootTest(properties = {"onestep.gemini.enabled=true", "onestep.youth-center.enabled=true"})
class ProviderWiringTest {

    @Autowired
    private ApplicationContext context;

    @Test
    void realProvidersReplaceMocks() {
        assertThat(context.getBeansOfType(AiConversationProvider.class).values())
                .singleElement().isInstanceOf(GeminiConversationProvider.class);
        assertThat(context.getBeansOfType(ProgramProvider.class).values())
                .singleElement().isInstanceOf(OntongYouthProgramProvider.class);
    }
}
