-- Curated memory store: LLM-curated facts about project/user.
-- Unlike raw vector embeddings, these are structured facts extracted
-- and validated by the agent, periodically consolidated.

CREATE TABLE IF NOT EXISTS curated_memory (
    id           TEXT    PRIMARY KEY NOT NULL,
    fact         TEXT    NOT NULL,
    category     TEXT    NOT NULL DEFAULT 'project',
    source       TEXT    NOT NULL DEFAULT 'manual',
    confidence   REAL    NOT NULL DEFAULT 1.0,
    created_at   INTEGER NOT NULL,
    updated_at   INTEGER NOT NULL,
    access_count INTEGER NOT NULL DEFAULT 0,
    tags_json    TEXT    NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_curated_memory_category
    ON curated_memory(category);
CREATE INDEX IF NOT EXISTS idx_curated_memory_confidence
    ON curated_memory(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_curated_memory_updated
    ON curated_memory(updated_at DESC);
