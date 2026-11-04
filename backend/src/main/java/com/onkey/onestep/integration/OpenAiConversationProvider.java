package com.onkey.onestep.integration;

import java.net.SocketTimeoutException;
import java.net.http.HttpClient;
import java.net.http.HttpTimeoutException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.onkey.onestep.common.ApiException;
import com.onkey.onestep.common.AppProperties;
import com.onkey.onestep.common.ErrorCode;
import com.onkey.onestep.inquiry.InquiryDtos.InquiryDraftRequest;
import com.onkey.onestep.simulation.Level;
import com.onkey.onestep.simulation.SimulationDtos.ChatLine;
import com.onkey.onestep.simulation.SimulationDtos.Opening;
import com.onkey.onestep.simulation.SimulationDtos.Reply;
import com.onkey.onestep.simulation.SimulationDtos.SimulationCompleteResponse;
import com.onkey.onestep.simulation.SimulationDtos.SimulationContext;
import com.onkey.onestep.timeline.TimelineDtos.ProgramRef;
import com.onkey.onestep.timeline.TimelineDtos.TimelineDraft;

import lombok.extern.slf4j.Slf4j;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.ObjectMapper;

/**
 * OpenAI Chat Completions 연동. {@code onestep.openai.enabled=true} 일 때만 활성화된다.
 * JSON 모드({@code response_format=json_object})로 받아 각 작업의 JSON 형식으로 읽는다.
 * 실패 매핑: 12초 응답 지연 → LLM_TIMEOUT, HTTP 429 → RATE_LIMITED, 그 밖의 실패·거절·JSON 형식 오류 → LLM_ERROR.
 * 요청·응답 본문과 API 키는 로그에 남기지 않는다(상태 코드·지연 시간만).
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "onestep.openai.enabled", havingValue = "true")
public class OpenAiConversationProvider implements AiConversationProvider {

    static final String BASE_URL = "https://api.openai.com";
    static final String DEFAULT_MODEL = "gpt-5-mini";
    static final Duration READ_TIMEOUT = Duration.ofSeconds(12);
    static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String model;
    /** 추론 모델의 생각 분량(minimal·low 등). 비어 있으면 보내지 않는다. 추론 모델이 아니면 비워 둔다. */
    private final String reasoningEffort;

    public OpenAiConversationProvider(AppProperties properties, ObjectMapper objectMapper) {
        AppProperties.OpenAi openai = properties.openai();
        this.apiKey = openai == null || openai.apiKey() == null ? "" : openai.apiKey().trim();
        this.model = openai == null || openai.model() == null || openai.model().isBlank()
                ? DEFAULT_MODEL : openai.model().trim();
        this.reasoningEffort = openai == null || openai.reasoningEffort() == null ? "" : openai.reasoningEffort().trim();
        this.objectMapper = objectMapper;

        HttpClient httpClient = HttpClient.newBuilder().connectTimeout(CONNECT_TIMEOUT).build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(READ_TIMEOUT);
        this.restClient = RestClient.builder().baseUrl(BASE_URL).requestFactory(factory).build();

        if (apiKey.isEmpty()) {
            log.warn("openai enabled but OPENAI_API_KEY is empty; AI calls will fail with LLM_ERROR");
        }
        log.info("openai provider active model={} reasoningEffort={} promptVersion={}",
                model, reasoningEffort.isEmpty() ? "-" : reasoningEffort, Prompts.PROMPT_VERSION);
    }

    @Override
    public String source() {
        return "OPENAI";
    }

    @Override
    public TimelineDraft generateTimeline(String noticeText, List<String> concerns, ProgramRef program) {
        String prompt = Prompts.TIMELINE_TASK
                + "\n<notice>\n" + Prompts.data(noticeText) + "\n</notice>"
                + "\n<concerns>\n" + Prompts.data(String.join("\n", concerns)) + "\n</concerns>";
        TimelineDraft draft = call("timeline", prompt, TimelineDraft.class);
        if (draft.steps() == null || draft.steps().isEmpty()) {
            throw new ApiException(ErrorCode.LLM_ERROR);
        }
        return program == null ? draft
                : new TimelineDraft(program, draft.steps(), draft.checklist(), draft.unknowns(), draft.tips());
    }

    @Override
    public Opening startSimulation(SimulationContext ctx) {
        String prompt = Prompts.SIMULATION_START_TASK + "\n" + context(ctx)
                + "\n<concerns>\n" + Prompts.data(String.join("\n", ctx.concerns())) + "\n</concerns>";
        Opening opening = call("simulation.start", prompt, Opening.class);
        if (isBlank(opening.text())
                || (ctx.level() == Level.L2 && (opening.choices() == null || opening.choices().size() < 3))
                || (ctx.level() == Level.L1 && (opening.script() == null || opening.script().isEmpty()))) {
            throw new ApiException(ErrorCode.LLM_ERROR);
        }
        List<ChatLine> script = opening.script() == null ? null
                : opening.script().stream().filter(l -> l != null && l.role() != null && !isBlank(l.text())).toList();
        return new Opening(opening.text().trim(), opening.choices(), script);
    }

    @Override
    public Reply reply(SimulationContext ctx, List<ChatLine> history, String userText, int turn, boolean finished) {
        String prompt = Prompts.SIMULATION_REPLY_TASK + "\n" + context(ctx)
                + "\nturn: " + turn + ", finished: " + finished
                + "\n<history>\n" + transcript(history) + "\n</history>"
                + "\n<user_text>\n" + Prompts.data(userText) + "\n</user_text>";
        Reply reply = call("simulation.reply", prompt, Reply.class);
        if (isBlank(reply.text())) {
            throw new ApiException(ErrorCode.LLM_ERROR);
        }
        return new Reply(reply.text().trim(), reply.choices(), reply.alternatives());
    }

    @Override
    public SimulationCompleteResponse summarize(SimulationContext ctx, List<ChatLine> history) {
        String prompt = Prompts.SIMULATION_SUMMARY_TASK + "\n" + context(ctx)
                + "\n<history>\n" + transcript(history) + "\n</history>";
        SimulationCompleteResponse summary = call("simulation.summary", prompt, SimulationCompleteResponse.class);
        if (isBlank(summary.summary())) {
            throw new ApiException(ErrorCode.LLM_ERROR);
        }
        return summary;
    }

    @Override
    public String refineInquiry(InquiryDraftRequest request, String template) {
        String prompt = Prompts.INQUIRY_TASK
                + "\n<request>\n프로그램: " + Prompts.data(request.programTitle())
                + "\n기관: " + Prompts.data(request.organization())
                + "\n질문: " + Prompts.data(String.join(", ", request.questions()))
                + "\n메모: " + Prompts.data(request.userNote())
                + "\n초안:\n" + Prompts.data(template) + "\n</request>";
        InquiryText text = call("inquiry", prompt, InquiryText.class);
        if (isBlank(text.text())) {
            throw new ApiException(ErrorCode.LLM_ERROR);
        }
        return text.text().trim();
    }

    // ---- 내부 ----

    @JsonIgnoreProperties(ignoreUnknown = true)
    record InquiryText(String text) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record ChatResponse(List<Choice> choices) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Choice(Message message) {}

    /** refusal 이 있으면 모델이 답을 거절한 것이다. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    record Message(String content, String refusal) {}

    private <T> T call(String operation, String prompt, Class<T> type) {
        if (apiKey.isEmpty()) {
            throw new ApiException(ErrorCode.LLM_ERROR);
        }
        // 추론 모델은 temperature 를 바꿀 수 없어 보내지 않는다.
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", model);
        body.put("messages", List.of(
                Map.of("role", "system", "content", Prompts.SYSTEM),
                Map.of("role", "user", "content", prompt)));
        body.put("response_format", Map.of("type", "json_object"));
        if (!reasoningEffort.isEmpty()) {
            body.put("reasoning_effort", reasoningEffort);
        }

        long start = System.nanoTime();
        String raw;
        try {
            byte[] response = restClient.post()
                    .uri("/v1/chat/completions")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(objectMapper.writeValueAsBytes(body))
                    .retrieve()
                    .body(byte[].class);
            raw = response == null ? "" : new String(response, StandardCharsets.UTF_8);
        } catch (RestClientResponseException e) {
            int status = e.getStatusCode().value();
            log.warn("openai call failed op={} status={} latencyMs={}", operation, status, elapsed(start));
            throw new ApiException(status == HttpStatus.TOO_MANY_REQUESTS.value()
                    ? ErrorCode.RATE_LIMITED : ErrorCode.LLM_ERROR);
        } catch (ResourceAccessException e) {
            boolean timeout = isTimeout(e);
            log.warn("openai call failed op={} reason={} latencyMs={}", operation,
                    timeout ? "timeout" : "io", elapsed(start));
            throw new ApiException(timeout ? ErrorCode.LLM_TIMEOUT : ErrorCode.LLM_ERROR);
        } catch (RestClientException e) {
            log.warn("openai call failed op={} reason=client latencyMs={}", operation, elapsed(start));
            throw new ApiException(ErrorCode.LLM_ERROR);
        }
        log.info("openai call ok op={} latencyMs={}", operation, elapsed(start));

        try {
            ChatResponse envelope = objectMapper.readValue(raw, ChatResponse.class);
            Message message = envelope.choices() == null || envelope.choices().isEmpty()
                    || envelope.choices().get(0) == null ? null : envelope.choices().get(0).message();
            if (message != null && !isBlank(message.refusal())) {
                log.warn("openai refused op={}", operation);
                throw new ApiException(ErrorCode.LLM_ERROR);
            }
            String json = message == null ? null : message.content();
            if (json == null || json.isBlank()) {
                throw new ApiException(ErrorCode.LLM_ERROR);
            }
            T result = objectMapper.readerFor(type)
                    .without(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
                    .readValue(stripFence(json));
            if (result == null) {
                throw new ApiException(ErrorCode.LLM_ERROR);
            }
            return result;
        } catch (JacksonException e) {
            log.warn("openai response unparseable op={}", operation);
            throw new ApiException(ErrorCode.LLM_ERROR);
        }
    }

    private static String context(SimulationContext ctx) {
        return "장면: " + ctx.sceneId().label() + " (" + ctx.sceneId() + ")"
                + "\n난이도: " + ctx.level() + " (최대 " + ctx.level().maxTurns() + "턴)"
                + "\n<notice>프로그램 이름: " + Prompts.data(ctx.programTitle() == null ? "알 수 없음" : ctx.programTitle())
                + "</notice>";
    }

    private static String transcript(List<ChatLine> history) {
        return history.stream()
                .map(l -> l.role() + ": " + Prompts.data(l.text()))
                .collect(Collectors.joining("\n"));
    }

    private static String stripFence(String json) {
        String trimmed = json.trim();
        if (trimmed.startsWith("```")) {
            trimmed = trimmed.replaceFirst("^```(json)?", "").replaceFirst("```$", "").trim();
        }
        return trimmed;
    }

    private static boolean isTimeout(Throwable e) {
        for (Throwable t = e; t != null; t = t.getCause()) {
            if (t instanceof HttpTimeoutException || t instanceof SocketTimeoutException) {
                return true;
            }
        }
        return false;
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private static long elapsed(long start) {
        return (System.nanoTime() - start) / 1_000_000;
    }
}
