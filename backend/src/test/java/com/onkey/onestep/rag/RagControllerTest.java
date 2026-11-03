package com.onkey.onestep.rag;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import com.onkey.onestep.common.GlobalExceptionHandler;

class RagControllerTest {
    private final RagService service=mock(RagService.class);
    private final RagProperties props=new RagProperties(true,"","","","","text-embedding-3-small",1536,"secret",4,0.25,false,List.of());
    private final MockMvc mvc=MockMvcBuilders.standaloneSetup(new RagController(service,props))
            .setControllerAdvice(new GlobalExceptionHandler()).build();

    @Test void ingestionRequiresAdminToken() throws Exception {
        mvc.perform(post("/api/v1/rag/index").contentType(MediaType.APPLICATION_JSON).content("{\"programId\":\"ontong-123\"}"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("RAG_FORBIDDEN"));
        verifyNoInteractions(service);
    }
    @Test void searchRejectsEmptyQueryAndExcessiveTopK() throws Exception {
        mvc.perform(post("/api/v1/rag/search").contentType(MediaType.APPLICATION_JSON)
                .content("{\"programId\":\"ontong-123\",\"query\":\"\",\"topK\":100}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
    @Test void validSearchReturnsEvidenceContract() throws Exception {
        when(service.search(any())).thenReturn(new RagDtos.SearchResponse("ontong-123","NOT_INDEXED",null,List.of(),0,0));
        mvc.perform(post("/api/v1/rag/search").contentType(MediaType.APPLICATION_JSON)
                .content("{\"programId\":\"ontong-123\",\"query\":\"신청 방법\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("NOT_INDEXED"))
                .andExpect(jsonPath("$.evidence").isArray());
    }
}
