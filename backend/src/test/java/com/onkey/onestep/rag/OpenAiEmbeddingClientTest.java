package com.onkey.onestep.rag;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.onkey.onestep.common.ApiException;
import com.onkey.onestep.common.ErrorCode;

class OpenAiEmbeddingClientTest {
    private final HttpClient http = mock(HttpClient.class);
    private final OpenAiEmbeddingClient client = new OpenAiEmbeddingClient("secret-test-key",
            "text-embedding-3-small", 2, URI.create("https://api.openai.com/v1/embeddings"), http);

    @Test
    void restoresInputOrderUsingResponseIndices() throws Exception {
        respond(200, """
                {"model":"text-embedding-3-small","data":[
                  {"index":1,"embedding":[0.5,0.8]},
                  {"index":0,"embedding":[0.3,0.4]}]}
                """);
        List<float[]> vectors = client.embed(List.of("첫 번째", "두 번째"));
        assertThat(vectors.get(0)).containsExactly(0.3f, 0.4f);
        assertThat(vectors.get(1)).containsExactly(0.5f, 0.8f);
    }

    @Test
    void rejectsDuplicateIndices() throws Exception {
        respond(200, """
                {"model":"text-embedding-3-small","data":[
                  {"index":0,"embedding":[0.5,0.8]},
                  {"index":0,"embedding":[0.3,0.4]}]}
                """);
        assertThatThrownBy(() -> client.embed(List.of("첫 번째", "두 번째"))).isInstanceOf(ApiException.class);
    }

    @Test
    void rejectsWrongDimensionAndNonNumericValues() throws Exception {
        for (String vector : List.of("[0.5]", "[0.3,\"not-a-number\"]", "[1e300,0.1]", "[0,0]")) {
            respond(200, "{\"model\":\"text-embedding-3-small\",\"data\":[{\"index\":0,\"embedding\":" + vector + "}]}");
            assertThatThrownBy(() -> client.embed(List.of("질문"))).isInstanceOf(ApiException.class);
        }
    }

    @Test
    void doesNotExposeKeyOrUpstreamErrorBody() throws Exception {
        respond(401, "invalid secret-test-key sensitive-query");
        assertThatThrownBy(() -> client.embed(List.of("sensitive-query")))
                .isInstanceOfSatisfying(ApiException.class, e -> {
                    assertThat(e.getErrorCode()).isEqualTo(ErrorCode.LLM_ERROR);
                    assertThat(e.getMessage()).doesNotContain("secret-test-key", "sensitive-query");
                    assertThat(e.getCause()).isNull();
                });
    }

    @Test
    void mapsRateLimitsAndTimeouts() throws Exception {
        respond(429, "upstream body");
        assertThatThrownBy(() -> client.embed(List.of("질문")))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.RATE_LIMITED));
        when(http.send(any(HttpRequest.class), org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<String>>any()))
                .thenThrow(new HttpTimeoutException("sensitive endpoint detail"));
        assertThatThrownBy(() -> client.embed(List.of("질문")))
                .isInstanceOfSatisfying(ApiException.class, e -> {
                    assertThat(e.getErrorCode()).isEqualTo(ErrorCode.LLM_TIMEOUT);
                    assertThat(e.getMessage()).doesNotContain("sensitive");
                });
    }

    @Test
    void rejectsOversizedInputBeforeNetwork() {
        assertThatThrownBy(() -> client.embed(List.of("한".repeat(3000))))
                .isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(http);
    }

    @Test
    void rejectsUnsupportedConfiguration() {
        assertThatThrownBy(() -> new OpenAiEmbeddingClient("key", "text-embedding-3-small", 3072))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new OpenAiEmbeddingClient("", "text-embedding-3-small", 1536))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @SuppressWarnings("unchecked")
    private void respond(int status, String body) throws Exception {
        HttpResponse<String> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(status);
        when(response.body()).thenReturn(body);
        when(http.send(any(HttpRequest.class), org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<String>>any()))
                .thenReturn(response);
    }
}
