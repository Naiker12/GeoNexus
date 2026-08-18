-- 20260608000003_conversations.sql
-- Fase 7, Bloque A: conversaciones y mensajes persistidos.

CREATE TABLE IF NOT EXISTS conversations (
    id           TEXT    PRIMARY KEY NOT NULL,
    project_id   TEXT    NOT NULL,
    workspace_id TEXT,
    title        TEXT,
    provider     TEXT    NOT NULL DEFAULT 'ollama',
    model        TEXT    NOT NULL DEFAULT '',
    created_at   INTEGER NOT NULL,
    updated_at   INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_conversations_project
    ON conversations(project_id);

CREATE TABLE IF NOT EXISTS messages (
    id              TEXT    PRIMARY KEY NOT NULL,
    conversation_id TEXT    NOT NULL,
    role            TEXT    NOT NULL,
    content         TEXT    NOT NULL,
    provider        TEXT,
    model           TEXT,
    trace_id        TEXT    NOT NULL DEFAULT '',
    chunks_used     TEXT,
    nodes_used      TEXT,
    tool_calls      TEXT,
    created_at      INTEGER NOT NULL,
    FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation
    ON messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_messages_trace
    ON messages(trace_id);
