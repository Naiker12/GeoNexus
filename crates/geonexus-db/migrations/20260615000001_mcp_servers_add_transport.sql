-- 20260615000001_mcp_servers_add_transport.sql
-- Extiende mcp_servers para soportar stdio y http con campos tipo Claude Desktop config.

ALTER TABLE mcp_servers ADD COLUMN transport TEXT NOT NULL DEFAULT 'http';
ALTER TABLE mcp_servers ADD COLUMN command TEXT;
ALTER TABLE mcp_servers ADD COLUMN args_json TEXT;
ALTER TABLE mcp_servers ADD COLUMN env_json TEXT;
ALTER TABLE mcp_servers ADD COLUMN headers_json TEXT;
ALTER TABLE mcp_servers ADD COLUMN disabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE mcp_servers ADD COLUMN auto_approve_json TEXT;
ALTER TABLE mcp_servers ADD COLUMN timeout_ms INTEGER DEFAULT 5000;
ALTER TABLE mcp_servers ADD COLUMN tools_count INTEGER;
ALTER TABLE mcp_servers ADD COLUMN protocol_version TEXT;
ALTER TABLE mcp_servers ADD COLUMN last_error TEXT;
