package com.onkey.onestep.rag;

import java.util.List;
import java.util.UUID;
import jakarta.validation.constraints.*;

public final class RagDtos {
    private RagDtos() {}
    public record IndexRequest(@NotBlank @Pattern(regexp = "ontong-[0-9]{1,30}") String programId) {}
    public record SearchRequest(@NotBlank @Pattern(regexp = "ontong-[0-9]{1,30}") String programId,
            @NotBlank @Size(max = 1000) String query, @Min(1) @Max(8) Integer topK) {}
    public record IndexResponse(String programId, String status, UUID documentVersion, int chunkCount) {}
    public record Evidence(UUID chunkId, String section, String text, String sourceUrl, double score) {}
    public record SearchResponse(String programId, String status, UUID documentVersion,
            List<Evidence> evidence, long embeddingMs, long searchMs) {}
    public record StatusResponse(String programId, String status, UUID documentVersion,
            String model, Integer dimensions, String lastError) {}
}
