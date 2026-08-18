-- 20260612000001_agent_tasks.sql
-- Migración: tabla de cola de tareas del sistema de agentes

CREATE TABLE IF NOT EXISTS agent_tasks (
    id          TEXT    PRIMARY KEY NOT NULL,
    agent_type  TEXT    NOT NULL,
    payload     TEXT    NOT NULL DEFAULT '{}',
    status      TEXT    NOT NULL DEFAULT 'pending',
    created_at  TEXT    NOT NULL,
    started_at  TEXT,
    completed_at TEXT,
    error       TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    project_id  TEXT    NOT NULL DEFAULT 'project-default'
);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_project ON agent_tasks(project_id, status);
