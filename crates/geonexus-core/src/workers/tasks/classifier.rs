use async_trait::async_trait;
use sqlx::SqlitePool;
use crate::types::task::AgentTask;
use crate::workers::handler::WorkerHandler;

fn classify_by_extension(file_path: &str) -> &'static str {
    let ext = file_path.rsplit('.').next().unwrap_or("").to_lowercase();
    match ext.as_str() {
        "rs" | "py" | "ts" | "tsx" | "js" | "go" | "java" | "c" | "cpp" | "rb" => "code",
        "md" | "txt" | "rst" | "pdf" | "doc" | "docx" => "documentation",
        "csv" | "json" | "xml" | "yaml" | "yml" | "toml" | "sql" => "data",
        "jpg" | "jpeg" | "png" | "gif" | "svg" | "webp" => "image",
        "shp" | "geojson" | "gpx" | "kml" | "tif" | "tiff" => "gis",
        "html" | "css" | "scss" | "less" | "vue" | "svelte" => "frontend",
        _ => "other",
    }
}

pub struct ClassifierWorker;

#[async_trait]
impl WorkerHandler for ClassifierWorker {
    fn agent_type(&self) -> &'static str {
        "classifier"
    }

    fn display_name(&self) -> &'static str {
        "Clasificador"
    }

    async fn execute(&self, task: &AgentTask, db: SqlitePool) -> Result<String, String> {
        let payload: serde_json::Value = serde_json::from_str(&task.payload)
            .map_err(|e| format!("Error al parsear payload: {e}"))?;

        tracing::info!("[ClassifierWorker] Clasificando tarea {}", task.id);

        let file_path = payload.get("file_path").and_then(|v| v.as_str()).unwrap_or("unknown");
        let file_type = payload.get("file_type").and_then(|v| v.as_str());
        let category = file_type.unwrap_or_else(|| classify_by_extension(file_path));

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS worker_classifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id TEXT NOT NULL,
                file_path TEXT NOT NULL,
                category TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now'))
            )"
        )
        .execute(&db)
        .await
        .map_err(|e| format!("Error creando tabla worker_classifications: {e}"))?;

        sqlx::query(
            "INSERT INTO worker_classifications (task_id, file_path, category) VALUES (?1, ?2, ?3)"
        )
        .bind(&task.id)
        .bind(file_path)
        .bind(category)
        .execute(&db)
        .await
        .map_err(|e| format!("Error insertando en worker_classifications: {e}"))?;

        Ok(format!("Archivo '{}' clasificado como '{}'", file_path, category))
    }
}
