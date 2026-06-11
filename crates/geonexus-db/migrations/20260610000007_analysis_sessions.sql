CREATE TABLE IF NOT EXISTS analysis_sessions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    workspace_id TEXT,
    title TEXT NOT NULL,
    objective TEXT NOT NULL,
    intent TEXT NOT NULL,
    datasets_used TEXT NOT NULL DEFAULT '[]',
    nodes_consulted TEXT NOT NULL DEFAULT '[]',
    tools_executed TEXT NOT NULL DEFAULT '[]',
    key_findings TEXT,
    deliverables TEXT,
    conversation_id TEXT NOT NULL,
    created_at INTEGER NOT NULL
);
