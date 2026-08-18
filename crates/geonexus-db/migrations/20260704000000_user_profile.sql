-- User profile: derived from usage patterns, stored in SQLite.
-- Consulted optionally to personalize responses.
-- User can disable this at any time (privacy).

CREATE TABLE IF NOT EXISTS user_profile (
    id              TEXT    PRIMARY KEY NOT NULL,
    key             TEXT    NOT NULL UNIQUE,
    value           TEXT    NOT NULL,
    category        TEXT    NOT NULL DEFAULT 'preference',
    confidence      REAL   NOT NULL DEFAULT 1.0,
    source          TEXT    NOT NULL DEFAULT 'derived',
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_profile_category ON user_profile(category);
CREATE INDEX IF NOT EXISTS idx_user_profile_key ON user_profile(key);
