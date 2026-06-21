-- 20260627000000_agent_model_name.sql
-- Añade modelo específico por agente y timestamp de última ejecución

ALTER TABLE agents ADD COLUMN model_name TEXT;
ALTER TABLE agents ADD COLUMN last_run_at INTEGER;
