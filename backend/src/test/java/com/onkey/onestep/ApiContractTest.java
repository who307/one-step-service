package com.onkey.onestep;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

@SpringBootTest
class ApiContractTest {

    @Autowired
    private WebApplicationContext context;

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context).build();
    }

    @Test
    void listsPrograms() throws Exception {
        mvc.perform(get("/api/v1/programs").param("category", "COOKING"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.source").value("MOCK"))
                .andExpect(jsonPath("$.items", hasSize(2)))
                .andExpect(jsonPath("$.items[1].isSample").value(true))
                .andExpect(jsonPath("$.items[1].applicationStart").value("2026-10-20"));
    }

    @Test
    void unknownProgramIs404() throws Exception {
        mvc.perform(get("/api/v1/programs/nope"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void shortNoticeIsInvalidLength() throws Exception {
        mvc.perform(post("/api/v1/timelines").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"noticeText\":\"짧아요\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_LENGTH"));
    }

    @Test
    void tooManyConcernsIsInvalidLength() throws Exception {
        mvc.perform(post("/api/v1/timelines").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"noticeText\":\"x\",\"concerns\":[\"a\",\"b\",\"c\",\"d\"]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_LENGTH"));
    }

    @Test
    void malformedJsonIsInvalidRequest() throws Exception {
        mvc.perform(post("/api/v1/simulations").contentType(MediaType.APPLICATION_JSON).content("{nope"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    void crisisStopsConversation() throws Exception {
        mvc.perform(post("/api/v1/simulations/abc/messages").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sceneId\":\"CHECKIN\",\"level\":\"L3\",\"history\":[],\"userText\":\"죽고 싶어요\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.crisis").value(true))
                .andExpect(jsonPath("$.reply").isEmpty())
                .andExpect(jsonPath("$.alternatives", hasSize(0)))
                .andExpect(jsonPath("$.turn").value(1))
                .andExpect(jsonPath("$.finished").value(true));
    }

    @Test
    void turnBeyondLimitIsInvalidState() throws Exception {
        StringBuilder history = new StringBuilder();
        for (int i = 0; i < 5; i++) {
            if (i > 0) history.append(',');
            history.append("{\"role\":\"AI\",\"text\":\"질문\"},{\"role\":\"USER\",\"text\":\"답\"}");
        }
        mvc.perform(post("/api/v1/simulations/abc/messages").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sceneId\":\"CHECKIN\",\"level\":\"L2\",\"history\":[" + history
                                + "],\"userText\":\"네\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("INVALID_STATE"));
    }

    @Test
    void lastTurnFinishes() throws Exception {
        StringBuilder history = new StringBuilder();
        for (int i = 0; i < 4; i++) {
            if (i > 0) history.append(',');
            history.append("{\"role\":\"AI\",\"text\":\"질문\"},{\"role\":\"USER\",\"text\":\"답\"}");
        }
        mvc.perform(post("/api/v1/simulations/abc/messages").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sceneId\":\"CHECKIN\",\"level\":\"L2\",\"history\":[" + history
                                + "],\"userText\":\"네\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.turn").value(5))
                .andExpect(jsonPath("$.finished").value(true))
                .andExpect(jsonPath("$.reply.choices").isEmpty());
    }

    @Test
    void l1StartHasScriptAndNoChoices() throws Exception {
        mvc.perform(post("/api/v1/simulations").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sceneId\":\"GREETING\",\"level\":\"L1\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.maxTurns").value(6))
                .andExpect(jsonPath("$.opening.choices").isEmpty())
                .andExpect(jsonPath("$.script", hasSize(6)))
                .andExpect(jsonPath("$.script[0].role").value("AI"))
                .andExpect(jsonPath("$.script[1].role").value("USER"));
    }

    @Test
    void longUserTextIsInvalidLength() throws Exception {
        String text = "가".repeat(301);
        mvc.perform(post("/api/v1/simulations/abc/messages").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sceneId\":\"CHECKIN\",\"level\":\"L3\",\"userText\":\"" + text + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_LENGTH"));
    }
}
