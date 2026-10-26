package com.onkey.onestep.program.client;

import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** onestep.youth-center.enabled=false 일 때 쓰는 빈 구현. 시드 데이터(DataSeeder)만으로 동작한다. */
@Component
@ConditionalOnProperty(name = "onestep.youth-center.enabled", havingValue = "false", matchIfMissing = true)
public class MockYouthCenterClient implements YouthCenterClient {

    @Override
    public List<YouthPolicyItem> search(String keyword, String region) {
        return List.of();
    }
}
