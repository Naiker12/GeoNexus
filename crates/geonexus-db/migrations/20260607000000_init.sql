-- 20260607000000_init.sql
-- Migración inicial para la base de datos de GeoNexus (con correcciones V4)

-- Tabla de workspaces por proyecto
CREATE TABLE IF NOT EXISTS workspaces (
    id          TEXT    PRIMARY KEY NOT NULL,
    project_id  TEXT    NOT NULL,
    name        TEXT    NOT NULL DEFAULT 'Principal',
    description TEXT,
    is_default  INTEGER NOT NULL DEFAULT 0,
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workspaces_project ON workspaces(project_id);

-- Tabla de activos de datos (inventario local) — corregida V4
CREATE TABLE IF NOT EXISTS assets (
    id           TEXT    PRIMARY KEY NOT NULL,
    project_id   TEXT    NOT NULL,
    workspace_id TEXT,
    name         TEXT    NOT NULL,
    kind         TEXT    NOT NULL,
    source       TEXT    NOT NULL,
    location     TEXT    NOT NULL,
    agent_id     TEXT,
    connector_id TEXT,
    status       TEXT    NOT NULL DEFAULT 'pending',
    size_bytes   INTEGER,
    chunks       INTEGER NOT NULL DEFAULT 0,
    embeddings   INTEGER NOT NULL DEFAULT 0,
    graph_nodes  INTEGER NOT NULL DEFAULT 0,
    cache_state  TEXT    NOT NULL DEFAULT 'none',
    trace_id     TEXT,
    created_at   INTEGER NOT NULL,
    updated_at   INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assets_project   ON assets(project_id);
CREATE INDEX IF NOT EXISTS idx_assets_workspace ON assets(workspace_id);
CREATE INDEX IF NOT EXISTS idx_assets_status    ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_kind      ON assets(kind);

-- Tabla de configuraciones de conectores — corregida V4
CREATE TABLE IF NOT EXISTS connector_configs (
    id                 TEXT    PRIMARY KEY NOT NULL,
    project_id         TEXT    NOT NULL,
    workspace_id       TEXT,
    provider           TEXT    NOT NULL,
    display_name       TEXT    NOT NULL,
    root_path          TEXT,
    qgis_project_path  TEXT,
    base_url           TEXT,
    client_id          TEXT,
    tenant_id          TEXT,
    sync_folders       TEXT    NOT NULL DEFAULT '[]',
    file_filter        TEXT    NOT NULL DEFAULT '[]',
    max_file_mb        INTEGER NOT NULL DEFAULT 500,
    is_active          INTEGER NOT NULL DEFAULT 1,
    last_synced        INTEGER,
    created_at         INTEGER NOT NULL,
    updated_at         INTEGER NOT NULL
);

-- Tabla de archivos conocidos por los conectores (metadata de sync)
CREATE TABLE IF NOT EXISTS connector_files (
    id              TEXT    PRIMARY KEY NOT NULL,
    connector_id    TEXT    NOT NULL,
    name            TEXT    NOT NULL,
    path            TEXT    NOT NULL,
    local_path      TEXT,
    size_bytes      INTEGER,
    mime_type       TEXT,
    modified_remote INTEGER,
    modified_local  INTEGER,
    sync_status     TEXT    NOT NULL DEFAULT 'pending',
    etag            TEXT,
    created_at      INTEGER NOT NULL
);

-- Tabla de eventos de sincronización y logs de pipeline — corregida V4
CREATE TABLE IF NOT EXISTS sync_events (
    id           TEXT    PRIMARY KEY NOT NULL,
    project_id   TEXT    NOT NULL,
    workspace_id TEXT,
    connector_id TEXT,
    asset_id     TEXT,
    agent_id     TEXT,
    event_type   TEXT    NOT NULL,
    detail       TEXT,
    trace_id     TEXT    NOT NULL DEFAULT '',
    created_at   INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_events_project ON sync_events(project_id);
CREATE INDEX IF NOT EXISTS idx_sync_events_asset   ON sync_events(asset_id);
CREATE INDEX IF NOT EXISTS idx_sync_events_agent   ON sync_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_sync_events_trace   ON sync_events(trace_id);
