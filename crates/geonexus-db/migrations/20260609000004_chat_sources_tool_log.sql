-- 20260609000004_chat_sources_tool_log.sql
-- Fase 9: sources RAG + tool-call log

ALTER TABLE messages ADD COLUMN sources_json TEXT DEFAULT '[]';

CREATE TABLE IF NOT EXISTS chat_tool_calls (
    id              TEXT PRIMARY KEY NOT NULL,
    message_id      TEXT REFERENCES messages(id),
    conversation_id TEXT REFERENCES conversations(id),
    tool_name       TEXT NOT NULL,
    args_json       TEXT,
    result_summary  TEXT,
    round           INTEGER DEFAULT 1,
    created_at      INTEGER NOT NULL
);
