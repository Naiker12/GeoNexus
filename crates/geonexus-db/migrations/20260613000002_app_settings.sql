-- 20260613000002_app_settings.sql
-- Almacenamiento clave-valor para configuraciones de la aplicación.

CREATE TABLE IF NOT EXISTS app_settings (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL,
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Settings predefinidas con valores por defecto
INSERT OR IGNORE INTO app_settings (key, value) VALUES
    ('embeddings_model', ''),
    ('telegram_config', ''),
    ('theme', 'geo-light');
