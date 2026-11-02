package com.onkey.onestep.rag;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import jakarta.validation.Valid;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.*;
import com.onkey.onestep.common.ApiException;
import com.onkey.onestep.common.ErrorCode;
import com.onkey.onestep.rag.RagDtos.*;

@RestController
@RequestMapping("/api/v1/rag")
@ConditionalOnProperty(name="onestep.rag.enabled",havingValue="true")
public class RagController {
    private final RagService service;
    private final byte[] adminToken;
    public RagController(RagService service, RagProperties properties) {
        this.service=service;
        this.adminToken=properties.adminToken().getBytes(StandardCharsets.UTF_8);
    }
    @PostMapping("/index")
    public IndexResponse index(@RequestHeader(value="X-RAG-Admin-Token",required=false) String token,
            @Valid @RequestBody IndexRequest request) {
        if (token==null || adminToken.length==0 || !MessageDigest.isEqual(adminToken,token.getBytes(StandardCharsets.UTF_8)))
            throw new ApiException(ErrorCode.RAG_FORBIDDEN);
        return service.index(request.programId());
    }
    @PostMapping("/search")
    public SearchResponse search(@Valid @RequestBody SearchRequest request) { return service.search(request); }
    @GetMapping("/status/{programId}")
    public StatusResponse status(@PathVariable String programId) { return service.status(programId); }
}
