-- 20260619000000_mcp_allowlist_rate_limit.sql
-- Agrega last_called_at para enforce rate limiting

ALTER TABLE mcp_allowlist ADD COLUMN last_called_at TEXT;
