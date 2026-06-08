-- 20260607000001_phase3.sql
-- Migración para la Fase 3: Indexación Documental y Vectorial (Chunks y Grafo)

-- Tabla para guardar los fragmentos (chunks) de los documentos
CREATE TABLE IF NOT EXISTS document_chunks (
    id          TEXT    PRIMARY KEY NOT NULL,
    asset_id    TEXT    NOT NULL,
    chunk_index INTEGER NOT NULL,
    content     TEXT    NOT NULL,
    token_count INTEGER NOT NULL DEFAULT 0,
    page_number INTEGER,
    created_at  INTEGER NOT NULL,
    FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chunks_asset ON document_chunks(asset_id);

-- Tabla para nodos del grafo de conocimiento
CREATE TABLE IF NOT EXISTS graph_nodes (
    id           TEXT    PRIMARY KEY NOT NULL,
    project_id   TEXT    NOT NULL,
    workspace_id TEXT,
    name         TEXT    NOT NULL,
    kind         TEXT    NOT NULL, -- "norma" | "documento" | "capa" | "zona" | "concepto"
    description  TEXT    NOT NULL,
    evidence     TEXT    NOT NULL,
    x            REAL    NOT NULL,
    y            REAL    NOT NULL,
    weight       INTEGER NOT NULL DEFAULT 1,
    created_at   INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_graph_nodes_project   ON graph_nodes(project_id);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_workspace ON graph_nodes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_kind      ON graph_nodes(kind);

-- Tabla para aristas/relaciones del grafo de conocimiento
CREATE TABLE IF NOT EXISTS graph_edges (
    id         TEXT    PRIMARY KEY NOT NULL,
    project_id TEXT    NOT NULL,
    source     TEXT    NOT NULL, -- ID del nodo origen
    target     TEXT    NOT NULL, -- ID del nodo destino
    relation   TEXT    NOT NULL,
    strength   INTEGER NOT NULL DEFAULT 50, -- porcentaje o fuerza de relación
    created_at INTEGER NOT NULL,
    FOREIGN KEY(source) REFERENCES graph_nodes(id) ON DELETE CASCADE,
    FOREIGN KEY(target) REFERENCES graph_nodes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_graph_edges_project ON graph_edges(project_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_source  ON graph_edges(source);
CREATE INDEX IF NOT EXISTS idx_graph_edges_target  ON graph_edges(target);
