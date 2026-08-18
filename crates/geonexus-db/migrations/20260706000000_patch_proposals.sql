CREATE TABLE IF NOT EXISTS patch_proposals (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL,
    conversation_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    original_content TEXT,
    proposed_content TEXT NOT NULL,
    diff TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_patch_proposals_project ON patch_proposals(project_id);
CREATE INDEX IF NOT EXISTS idx_patch_proposals_status ON patch_proposals(status);
