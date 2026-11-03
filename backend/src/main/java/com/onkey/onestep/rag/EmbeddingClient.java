package com.onkey.onestep.rag;

import java.util.List;

/** 문서와 질문 모두 같은 모델·차원 설정을 사용한다. 입력 순서대로 벡터를 반환한다. */
public interface EmbeddingClient {
    List<float[]> embed(List<String> inputs);
    String model();
    int dimensions();
}
