-- 20260613000004_mcp_server_metrics.sql
-- Métricas históricas de servidores MCP para monitoreo y análisis.
-- Almacena snapshots periódicos de latencia, estado y conteo de errores.

CREATE TABLE IF NOT EXISTS mcp_server_metrics (
    id            TEXT PRIMARY KEY,
    server_id     TEXT NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
    status        TEXT NOT NULL,
    latency_ms    INTEGER,
    error_count   INTEGER DEFAULT 0,
    tool_calls_ok     INTEGER DEFAULT 0,
    tool_calls_error  INTEGER DEFAULT 0,
    sampled_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_mcp_metrics_server   ON mcp_server_metrics(server_id);
CREATE INDEX IF NOT EXISTS idx_mcp_metrics_sampled   ON mcp_server_metrics(sampled_at);
