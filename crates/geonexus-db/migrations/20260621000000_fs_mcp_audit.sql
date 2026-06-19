-- Filesystem MCP: audit log + allowed paths + pending confirmations
-- Section 14 of filesystem-mcp-arquitectura.md

CREATE TABLE IF NOT EXISTS fs_allowed_paths (
    id TEXT PRIMARY KEY,
    path TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    level TEXT NOT NULL DEFAULT 'read',
    added_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS fs_audit_log (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    target_path TEXT NOT NULL,
    level_required TEXT NOT NULL,
    approved INTEGER NOT NULL,
    confirmed_by_user INTEGER,
    duration_ms INTEGER,
    error TEXT,
    created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fs_audit_session ON fs_audit_log(session_id, created_at DESC);

CREATE TABLE IF NOT EXISTS fs_pending_confirmations (
    request_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    action TEXT NOT NULL,
    target_path TEXT NOT NULL,
    preview TEXT,
    created_at INTEGER NOT NULL,
    resolved_at INTEGER,
    approved INTEGER
);
