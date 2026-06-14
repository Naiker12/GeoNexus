ALTER TABLE mcp_servers ADD COLUMN auth_token TEXT;

ALTER TABLE mcp_tools ADD COLUMN last_discovered_at TEXT;

CREATE INDEX IF NOT EXISTS idx_mcp_tools_name ON mcp_tools(name);
