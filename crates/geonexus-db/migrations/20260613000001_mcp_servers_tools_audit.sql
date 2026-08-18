-- 20260613000001_mcp_servers_tools_audit.sql
-- Servidores MCP registrados, tools y auditoría de llamadas.

CREATE TABLE IF NOT EXISTS mcp_servers (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    url           TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'pending',
    auth_type     TEXT,
    auth_ref      TEXT,
    schema_json   TEXT,
    latency_ms    INTEGER,
    error_count   INTEGER DEFAULT 0,
    description   TEXT,
    last_ping_at  TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS mcp_tools (
    id            TEXT PRIMARY KEY,
    server_id     TEXT NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    description   TEXT,
    args_schema   TEXT,
    return_type   TEXT,
    status        TEXT NOT NULL DEFAULT 'ready',
    category      TEXT,
    args          TEXT,
    result        TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS mcp_tool_calls (
    id            TEXT PRIMARY KEY,
    server_id     TEXT NOT NULL,
    tool_name     TEXT NOT NULL,
    args_json     TEXT,
    result_json   TEXT,
    result_status TEXT NOT NULL,
    duration_ms   INTEGER,
    project_id    TEXT,
    workspace_id  TEXT,
    trace_id      TEXT NOT NULL,
    agent_name    TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS mcp_allowlist (
    id            TEXT PRIMARY KEY,
    server_id     TEXT NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
    tool_name     TEXT NOT NULL,
    allowed       INTEGER NOT NULL DEFAULT 1,
    rate_limit    INTEGER,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_mcp_tools_server ON mcp_tools(server_id);
CREATE INDEX IF NOT EXISTS idx_mcp_tool_calls_server ON mcp_tool_calls(server_id);
CREATE INDEX IF NOT EXISTS idx_mcp_tool_calls_trace ON mcp_tool_calls(trace_id);
CREATE INDEX IF NOT EXISTS idx_mcp_allowlist_server ON mcp_allowlist(server_id);
