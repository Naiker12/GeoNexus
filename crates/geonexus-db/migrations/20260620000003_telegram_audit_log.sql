-- 20260620000003_telegram_audit_log.sql
-- Auditoría de acceso para integración Telegram.

CREATE TABLE IF NOT EXISTS telegram_audit_log (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id           INTEGER NOT NULL,
    telegram_user_id  INTEGER NOT NULL,
    username          TEXT DEFAULT '',
    action            TEXT NOT NULL DEFAULT 'processed',
    created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_telegram_audit_created_at
    ON telegram_audit_log(created_at);
