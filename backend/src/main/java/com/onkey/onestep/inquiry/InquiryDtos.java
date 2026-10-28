package com.onkey.onestep.inquiry;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

public final class InquiryDtos {

    private InquiryDtos() {}

    public record InquiryDraftRequest(
            @Size(max = 100) String programTitle,
            @Size(max = 100) String organization,
            @NotEmpty @Size(min = 1, max = 5) List<@NotBlank @Size(max = 100) String> questions,
            @Size(max = 200) String userNote
    ) {}

    public record InquiryDraftResponse(String text) {}
}
