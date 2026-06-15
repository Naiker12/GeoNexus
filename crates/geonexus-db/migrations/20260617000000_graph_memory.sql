-- Graph Memory: seguimiento de uso y decaimiento de peso
-- Añade columnas para el algoritmo de memoria tipo Ebbinghaus

ALTER TABLE graph_nodes ADD COLUMN use_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE graph_nodes ADD COLUMN last_used_at TEXT;
ALTER TABLE graph_nodes ADD COLUMN memory_score REAL NOT NULL DEFAULT 1.0;
