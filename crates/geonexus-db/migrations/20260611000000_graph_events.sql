-- 20260611000000_graph_events.sql
-- Migración para Grafo Vivo: nuevos campos en graph_nodes para eventos reactivos

ALTER TABLE graph_nodes ADD COLUMN source_event TEXT NOT NULL DEFAULT '';
ALTER TABLE graph_nodes ADD COLUMN event_id TEXT NOT NULL DEFAULT '';
ALTER TABLE graph_nodes ADD COLUMN icon TEXT NOT NULL DEFAULT '';
ALTER TABLE graph_nodes ADD COLUMN is_ephemeral INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_graph_nodes_event_id ON graph_nodes(event_id);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_source_event ON graph_nodes(source_event);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_ephemeral ON graph_nodes(is_ephemeral);
