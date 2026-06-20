-- Rename old events table to legacy_events to avoid conflicts and retain backward compatibility
ALTER TABLE events RENAME TO legacy_events;

-- Drop obsolete geo_events table from previous partial implementation
DROP TABLE IF EXISTS geo_events;

-- Drop legacy artifacts table to recreate with exact Phase 3 schema
DROP TABLE IF EXISTS artifacts;

-- Create new events table
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    payload TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (session_id) REFERENCES conversations(id)
);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type, timestamp);

-- Create new artifacts table
CREATE TABLE IF NOT EXISTS artifacts (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    name TEXT NOT NULL,
    artifact_type TEXT NOT NULL,
    path TEXT,
    content TEXT,
    metadata TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL,
    FOREIGN KEY (session_id) REFERENCES conversations(id)
);
CREATE INDEX IF NOT EXISTS idx_artifacts_session ON artifacts(session_id, created_at DESC);
