-- 20260607000002_phase4_containers_mcp.sql
-- Fase 4: auditoria de tool-calls de containers-mcp.

CREATE TABLE IF NOT EXISTS container_mcp_calls (
    id            TEXT    PRIMARY KEY NOT NULL,
    tool_name     TEXT    NOT NULL,
    provider      TEXT    NOT NULL,
    args_json     TEXT,
    result_status TEXT    NOT NULL,
    duration_ms   INTEGER,
    project_id    TEXT,
    trace_id      TEXT,
    created_at    INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_container_mcp_calls_project
    ON container_mcp_calls(project_id);

CREATE INDEX IF NOT EXISTS idx_container_mcp_calls_trace
    ON container_mcp_calls(trace_id);

CREATE INDEX IF NOT EXISTS idx_container_mcp_calls_tool
    ON container_mcp_calls(tool_name);
