package com.onkey.onestep.inquiry;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.onkey.onestep.inquiry.InquiryDtos.InquiryDraftRequest;
import com.onkey.onestep.inquiry.InquiryDtos.InquiryDraftResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class InquiryController {

    private final InquiryService inquiryService;

    @PostMapping("/inquiries/draft")
    public InquiryDraftResponse draft(@Valid @RequestBody InquiryDraftRequest request) {
        return inquiryService.draft(request);
    }
}
