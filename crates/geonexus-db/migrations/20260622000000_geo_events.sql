-- migrations/20260622000000_geo_events.sql
CREATE TABLE IF NOT EXISTS geo_events (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    payload TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (session_id) REFERENCES conversations(id)
);
CREATE INDEX IF NOT EXISTS idx_geo_events_session ON geo_events(session_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_geo_events_type ON geo_events(event_type, timestamp);
