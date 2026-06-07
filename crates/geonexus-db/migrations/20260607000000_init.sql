-- 20260607000000_init.sql
-- Migración inicial para la base de datos de GeoNexus

-- Tabla de activos de datos (inventario local)
CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    source TEXT NOT NULL,
    location TEXT NOT NULL,
    status TEXT NOT NULL,
    size_bytes INTEGER, -- nullable
    chunks INTEGER NOT NULL,
    embeddings INTEGER NOT NULL,
    graph_nodes INTEGER NOT NULL,
    cache_state TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Tabla de configuraciones de conectores
CREATE TABLE IF NOT EXISTS connector_configs (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    display_name TEXT NOT NULL,
    root_path TEXT,
    base_url TEXT,
    client_id TEXT,
    tenant_id TEXT,
    sync_folders TEXT NOT NULL, -- JSON array de directorios a sincronizar
    file_filter TEXT NOT NULL,  -- JSON array de extensiones permitidas
    max_file_mb INTEGER NOT NULL,
    is_active INTEGER NOT NULL, -- 0 o 1
    last_synced INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Tabla de archivos conocidos por los conectores (metadata de sync)
CREATE TABLE IF NOT EXISTS connector_files (
    id TEXT PRIMARY KEY NOT NULL,
    connector_id TEXT NOT NULL,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    local_path TEXT,
    size_bytes INTEGER,
    mime_type TEXT,
    modified_remote INTEGER,
    modified_local INTEGER,
    sync_status TEXT NOT NULL,
    etag TEXT,
    created_at INTEGER NOT NULL
);

-- Tabla de eventos de sincronización y logs de pipeline
CREATE TABLE IF NOT EXISTS sync_events (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL,
    connector_id TEXT,
    asset_id TEXT,
    event_type TEXT NOT NULL,
    detail TEXT,
    trace_id TEXT,
    created_at INTEGER NOT NULL
);
