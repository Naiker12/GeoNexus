ALTER TABLE mcp_tools ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'));
