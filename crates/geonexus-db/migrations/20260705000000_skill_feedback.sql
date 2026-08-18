-- Skill feedback and auto-improvement tracking.
-- When a skill fails or produces partial results, the event is recorded
-- so the agent can propose a patch.

CREATE TABLE IF NOT EXISTS skill_feedback (
    id              TEXT    PRIMARY KEY NOT NULL,
    skill_id        TEXT    NOT NULL REFERENCES skills(id),
    skill_name      TEXT    NOT NULL,
    conversation_id TEXT,
    success         INTEGER NOT NULL DEFAULT 1,
    error_message   TEXT,
    tool_calls_json TEXT,
    proposed_patch  TEXT,              -- LLM-proposed patch to the skill content
    patch_applied   INTEGER NOT NULL DEFAULT 0,
    created_at      INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_skill_feedback_skill ON skill_feedback(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_feedback_success ON skill_feedback(success);
