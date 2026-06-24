-- Automations: scheduled tasks defined in natural language.
-- The user describes intent ("every monday at 8am summarize my new docs")
-- and the agent translates it into this structured definition.

CREATE TABLE IF NOT EXISTS automations (
    id              TEXT    PRIMARY KEY NOT NULL,
    project_id      TEXT    NOT NULL,
    name            TEXT    NOT NULL,
    description     TEXT,
    cron_expression TEXT,              -- internal cron (hidden from user)
    intent          TEXT    NOT NULL,  -- original natural language description
    action_type     TEXT    NOT NULL DEFAULT 'chat',  -- chat, skill, web_search, export
    action_config   TEXT,              -- JSON config for the action
    channel         TEXT    NOT NULL DEFAULT 'all',  -- 'all', 'desktop', 'telegram', 'discord'
    enabled         INTEGER NOT NULL DEFAULT 1,
    last_run_at     INTEGER,
    next_run_at     INTEGER,
    run_count       INTEGER NOT NULL DEFAULT 0,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_automations_project ON automations(project_id);
CREATE INDEX IF NOT EXISTS idx_automations_next_run ON automations(next_run_at);
CREATE INDEX IF NOT EXISTS idx_automations_enabled ON automations(enabled);
