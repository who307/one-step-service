package com.onkey.onestep.integration;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.Optional;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import com.onkey.onestep.program.Program;

import lombok.extern.slf4j.Slf4j;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

/** {@code classpath:mock/programs.json} 을 읽어 메모리에 둔다(공개 공고 샘플, 사용자 데이터 아님). */
@Slf4j
@Component
@ConditionalOnProperty(name = "onestep.youth-center.enabled", havingValue = "false", matchIfMissing = true)
public class MockProgramProvider implements ProgramProvider {

    static final String RESOURCE = "mock/programs.json";

    private final List<Program> programs;

    public MockProgramProvider(ObjectMapper objectMapper) {
        this.programs = load(objectMapper);
        log.info("mock programs loaded count={}", programs.size());
    }

    public static List<Program> load(ObjectMapper objectMapper) {
        try (InputStream in = new ClassPathResource(RESOURCE).getInputStream()) {
            return List.copyOf(objectMapper.readValue(in, new TypeReference<List<Program>>() {}));
        } catch (IOException e) {
            throw new UncheckedIOException("failed to load " + RESOURCE, e);
        }
    }

    @Override
    public String source() {
        return "MOCK";
    }

    @Override
    public List<Program> findAll() {
        return programs;
    }

    @Override
    public Optional<Program> findById(String id) {
        return programs.stream().filter(p -> p.id().equals(id)).findFirst();
    }
}
