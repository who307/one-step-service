package com.onkey.onestep.inquiry;

import org.springframework.stereotype.Service;

import com.onkey.onestep.common.ApiException;
import com.onkey.onestep.integration.AiConversationProvider;
import com.onkey.onestep.inquiry.InquiryDtos.InquiryDraftRequest;
import com.onkey.onestep.inquiry.InquiryDtos.InquiryDraftResponse;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/** 문의 문장 초안. 자동 발송하지 않으며, AI 다듬기에 실패하면 템플릿을 그대로 돌려준다. */
@Slf4j
@Service
@RequiredArgsConstructor
public class InquiryService {

    private final AiConversationProvider provider;

    public InquiryDraftResponse draft(InquiryDraftRequest request) {
        String template = InquiryTemplate.build(request);
        String text;
        try {
            text = provider.refineInquiry(request, template);
        } catch (ApiException e) {
            log.info("inquiry refine fallback code={}", e.getErrorCode().code());
            text = template;
        }
        return new InquiryDraftResponse(text == null || text.isBlank() ? template : text);
    }
}
