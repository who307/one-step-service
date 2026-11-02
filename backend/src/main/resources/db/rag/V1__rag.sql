CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE rag_sources (
    program_id text PRIMARY KEY,
    active_version uuid,
    last_checked_at timestamptz
);
CREATE TABLE rag_document_versions (
    id uuid PRIMARY KEY,
    program_id text NOT NULL REFERENCES rag_sources(program_id),
    title text NOT NULL,
    source_url text NOT NULL,
    raw_json jsonb NOT NULL,
    content text NOT NULL,
    fingerprint text NOT NULL,
    model text NOT NULL,
    dimensions integer NOT NULL CHECK (dimensions > 0),
    pipeline_version text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (program_id, id),
    UNIQUE (program_id, fingerprint)
);
ALTER TABLE rag_sources ADD CONSTRAINT rag_active_version_fk
    FOREIGN KEY (program_id, active_version) REFERENCES rag_document_versions(program_id, id);
CREATE TABLE rag_chunks (
    id uuid PRIMARY KEY,
    version_id uuid NOT NULL REFERENCES rag_document_versions(id),
    ordinal integer NOT NULL,
    section text NOT NULL,
    content text NOT NULL,
    embedding vector NOT NULL,
    UNIQUE (version_id, ordinal)
);
-- 공고 하나의 적은 청크를 정확 검색한다. 모델 비교 시 3072차원도 별도 ANN 인덱스 없이 지원한다.
CREATE INDEX rag_chunks_version_idx ON rag_chunks(version_id);
CREATE TABLE rag_ingestion_jobs (
    id uuid PRIMARY KEY,
    program_id text NOT NULL REFERENCES rag_sources(program_id),
    status text NOT NULL CHECK (status IN ('INDEXING', 'READY', 'UNCHANGED', 'FAILED')),
    started_at timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz,
    error_code text
);
CREATE INDEX rag_jobs_program_idx ON rag_ingestion_jobs(program_id, started_at DESC);
