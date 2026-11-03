package com.onkey.onestep.rag;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import com.onkey.onestep.common.ApiException;
import com.onkey.onestep.common.ErrorCode;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

/** OpenAI Embeddings API. 오류 본문·요청·인증키를 로그나 예외에 포함하지 않는다. */
public final class OpenAiEmbeddingClient implements EmbeddingClient {
    private static final URI ENDPOINT = URI.create("https://api.openai.com/v1/embeddings");
    private static final int BATCH_SIZE = 16;
    // UTF-8 byte count is a conservative upper bound on token count; avoids sending oversized text.
    private static final int MAX_INPUT_BYTES = 8000;
    private final String apiKey;
    private final String model;
    private final int dimensions;
    private final URI endpoint;
    private final HttpClient http;
    private final ObjectMapper mapper = JsonMapper.builder().build();

    public OpenAiEmbeddingClient(String apiKey, String model, int dimensions) {
        this(apiKey, model, dimensions, ENDPOINT,
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5))
                        .followRedirects(HttpClient.Redirect.NEVER).build());
    }

    OpenAiEmbeddingClient(String apiKey, String model, int dimensions, URI endpoint, HttpClient http) {
        if (apiKey == null || apiKey.isBlank()) throw new IllegalArgumentException("OPENAI_API_KEY is required for RAG");
        if (!List.of("text-embedding-3-small", "text-embedding-3-large").contains(model)) {
            throw new IllegalArgumentException("Unsupported RAG embedding model");
        }
        int maximum = model.equals("text-embedding-3-small") ? 1536 : 3072;
        if (dimensions < 1 || dimensions > maximum) throw new IllegalArgumentException("Invalid RAG embedding dimensions");
        this.apiKey = apiKey.strip();
        this.model = model;
        this.dimensions = dimensions;
        this.endpoint = endpoint;
        this.http = http;
    }

    @Override public String model() { return model; }
    @Override public int dimensions() { return dimensions; }

    @Override
    public List<float[]> embed(List<String> inputs) {
        if (inputs == null) throw new IllegalArgumentException("Embedding inputs are required");
        if (inputs.isEmpty()) return List.of();
        for (String input : inputs) {
            if (input == null || input.isBlank() || input.getBytes(StandardCharsets.UTF_8).length > MAX_INPUT_BYTES) {
                throw new IllegalArgumentException("Embedding input is empty or too long");
            }
        }
        List<float[]> vectors = new ArrayList<>(inputs.size());
        for (int from = 0; from < inputs.size(); from += BATCH_SIZE) {
            vectors.addAll(batch(inputs.subList(from, Math.min(from + BATCH_SIZE, inputs.size()))));
        }
        return List.copyOf(vectors);
    }

    private List<float[]> batch(List<String> inputs) {
        try {
            String body = mapper.writeValueAsString(Map.of("model", model, "input", inputs,
                    "dimensions", dimensions, "encoding_format", "float"));
            HttpRequest request = HttpRequest.newBuilder(endpoint).timeout(Duration.ofSeconds(30))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body)).build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() != 200) {
                throw new ApiException(response.statusCode() == 429 ? ErrorCode.RATE_LIMITED : ErrorCode.LLM_ERROR,
                        "임베딩 요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.");
            }
            return parse(response.body(), inputs.size());
        } catch (HttpTimeoutException e) {
            throw new ApiException(ErrorCode.LLM_TIMEOUT);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ApiException(ErrorCode.LLM_ERROR);
        } catch (IOException | JacksonException e) {
            throw invalidResponse();
        }
    }

    private List<float[]> parse(String body, int count) {
        JsonNode root = mapper.readTree(body);
        if (root == null || !root.isObject()) throw invalidResponse();
        JsonNode data = root.path("data");
        if (!data.isArray() || data.size() != count || !model.equals(root.path("model").asString(""))) {
            throw invalidResponse();
        }
        float[][] ordered = new float[count][];
        for (JsonNode item : data) {
            JsonNode indexNode = item.path("index");
            if (!indexNode.isIntegralNumber()) throw invalidResponse();
            int index = indexNode.asInt(-1);
            JsonNode embedding = item.path("embedding");
            if (index < 0 || index >= count || ordered[index] != null
                    || !embedding.isArray() || embedding.size() != dimensions) throw invalidResponse();
            float[] vector = new float[dimensions];
            double squaredNorm = 0;
            for (int i = 0; i < dimensions; i++) {
                if (!embedding.get(i).isNumber()) throw invalidResponse();
                vector[i] = (float) embedding.get(i).asDouble();
                if (!Float.isFinite(vector[i])) throw invalidResponse();
                squaredNorm += (double) vector[i] * vector[i];
            }
            if (squaredNorm == 0) throw invalidResponse();
            ordered[index] = vector;
        }
        return Arrays.asList(ordered);
    }

    private static ApiException invalidResponse() {
        return new ApiException(ErrorCode.LLM_ERROR, "임베딩 응답을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
}
