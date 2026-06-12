-- 20260612000000_graph_persist.sql
-- Migración para romper cascade delete y agregar campos de persistencia en graph_nodes

-- 1. Agregar columnas a la tabla graph_nodes
ALTER TABLE graph_nodes ADD COLUMN source_asset_id TEXT REFERENCES assets(id) ON DELETE SET NULL;
ALTER TABLE graph_nodes ADD COLUMN source_chat_id TEXT REFERENCES conversations(id) ON DELETE SET NULL;
ALTER TABLE graph_nodes ADD COLUMN origin_kind TEXT NOT NULL DEFAULT 'document' CHECK(origin_kind IN ('document','chat','manual','import','connector'));
ALTER TABLE graph_nodes ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0;
ALTER TABLE graph_nodes ADD COLUMN deleted_at TEXT;

-- 2. Crear índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_graph_nodes_source_asset ON graph_nodes(source_asset_id);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_source_chat ON graph_nodes(source_chat_id);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_deleted ON graph_nodes(deleted_at);

-- 3. Migrar de forma segura los registros existentes desde `source_event` y `event_id`
UPDATE graph_nodes
SET source_asset_id = (SELECT id FROM assets WHERE id = event_id),
    origin_kind = 'document'
WHERE source_event = 'upload' OR source_event = 'sync';

UPDATE graph_nodes
SET source_chat_id = (SELECT id FROM conversations WHERE id = event_id),
    origin_kind = 'chat'
WHERE source_event = 'chat';
