-- Add archived support and FTS5 search for conversations

ALTER TABLE conversations ADD COLUMN archived_at INTEGER;

CREATE VIRTUAL TABLE IF NOT EXISTS conversations_fts USING fts5(
    title,
    content,
    conversation_id UNINDEXED
);

-- Populate FTS index from existing conversations and messages
INSERT OR IGNORE INTO conversations_fts(conversation_id, title, content)
SELECT c.id, COALESCE(c.title, ''), COALESCE(
    (SELECT GROUP_CONCAT(m.content, ' ')
     FROM messages m
     WHERE m.conversation_id = c.id
     ORDER BY m.created_at ASC),
    ''
)
FROM conversations c;
