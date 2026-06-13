-- 20260613000003_skills.sql
-- Skills system: SKILL.md management, activation tracking

CREATE TABLE IF NOT EXISTS skills (
    id              TEXT    PRIMARY KEY,
    name            TEXT    NOT NULL,
    description     TEXT,
    version         TEXT    NOT NULL DEFAULT '1.0.0',
    category        TEXT    NOT NULL DEFAULT 'gis',
    author          TEXT,
    tags_json       TEXT,
    mcp_servers_json TEXT,
    skill_md_path   TEXT    NOT NULL,
    skill_md_hash   TEXT,
    source_url      TEXT,
    enabled         INTEGER NOT NULL DEFAULT 1,
    builtin         INTEGER NOT NULL DEFAULT 0,
    use_count       INTEGER NOT NULL DEFAULT 0,
    last_used_at    INTEGER,
    installed_at    INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS skill_activations (
    id              TEXT    PRIMARY KEY,
    skill_id        TEXT    NOT NULL REFERENCES skills(id),
    conversation_id TEXT,
    workspace_id    TEXT,
    trigger         TEXT,
    tool_calls_json TEXT,
    created_at      INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);
CREATE INDEX IF NOT EXISTS idx_skills_enabled  ON skills(enabled);
CREATE INDEX IF NOT EXISTS idx_skill_activations_skill ON skill_activations(skill_id);
