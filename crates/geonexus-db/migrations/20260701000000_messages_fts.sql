-- Add FTS5 index for message-level full-text search.
-- This enables fast recall across sessions without LLM calls.

CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
    content,
    role UNINDEXED,
    conversation_id UNINDEXED,
    message_id UNINDEXED
);

-- Populate from existing messages
INSERT OR IGNORE INTO messages_fts(message_id, conversation_id, role, content)
SELECT m.id, m.conversation_id, m.role, m.content
FROM messages m;
