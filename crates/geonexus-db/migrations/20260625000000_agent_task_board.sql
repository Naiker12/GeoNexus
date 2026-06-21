-- 20260625000000_agent_task_board.sql
-- Migración: tabla del sistema de tareas del agente (task board)
-- Reemplaza el panel "Agente Inactivo" con un task board real

CREATE TABLE IF NOT EXISTS agent_task_board (
    id          TEXT PRIMARY KEY NOT NULL,
    title       TEXT NOT NULL,
    notes       TEXT,
    status      TEXT NOT NULL DEFAULT 'todo',
    priority    TEXT NOT NULL DEFAULT 'normal',
    data        TEXT NOT NULL DEFAULT '{}',
    project_path TEXT,
    connector_id TEXT,
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_task_board_status ON agent_task_board(status, created_at);
