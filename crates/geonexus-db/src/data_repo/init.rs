use std::path::Path;
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::{ConnectOptions, Row};
use crate::DataRepository;

impl DataRepository {
    /// Inicializa la base de datos, ejecuta las migraciones y si está vacía, inserta datos semilla.
    pub async fn new<P: AsRef<Path>>(db_path: P) -> Result<Self, String> {
        let db_path = db_path.as_ref();

        // Asegurar la existencia del directorio padre si es una ruta local de archivo
        if let Some(parent) = db_path.parent() {
            if !parent.as_os_str().is_empty() {
                std::fs::create_dir_all(parent)
                    .map_err(|e| format!("Error creando directorio de SQLite: {e}"))?;
            }
        }

        // Conectar a la base de datos usando la ruta de archivo directa.
        // En Windows el archivo no existe al inicio, así que hay que habilitar create_if_missing.
        let options = SqliteConnectOptions::new()
            .filename(db_path)
            .create_if_missing(true)
            .disable_statement_logging();

        let pool = SqlitePoolOptions::new()
            .connect_with(options)
            .await
            .map_err(|e| format!("Error conectando a SQLite: {e}"))?;

        // Ejecutar las migraciones
        sqlx::migrate!("./migrations")
            .run(&pool)
            .await
            .map_err(|e| format!("Error ejecutando migraciones SQLite: {e}"))?;

        let repo = Self { pool };

        // Limpiar datos demo legacy de ejecuciones anteriores
        repo.cleanup_legacy_demo().await?;

        // Sembrar datos si la DB está vacía
        repo.seed_if_empty().await?;

        Ok(repo)
    }

    /// Elimina datos demo legacy que pudieron haber quedado de ejecuciones anteriores.
    async fn cleanup_legacy_demo(&self) -> Result<(), String> {
        let pool = &self.pool;
        let _ = sqlx::query("DELETE FROM graph_edges WHERE source LIKE 'node-demo%' OR target LIKE 'node-demo%' OR source LIKE 'node-norma%' OR target LIKE 'node-norma%' OR source LIKE 'node-zona%' OR target LIKE 'node-zona%' OR source LIKE 'node-concepto%' OR target LIKE 'node-concepto%' OR source LIKE 'node-capa%' OR target LIKE 'node-capa%'")
            .execute(pool).await;
        let _ = sqlx::query("DELETE FROM graph_nodes WHERE id LIKE 'node-demo%' OR id LIKE 'node-norma%' OR id LIKE 'node-zona%' OR id LIKE 'node-concepto%' OR id LIKE 'node-capa%'")
            .execute(pool).await;
        let _ = sqlx::query("DELETE FROM sync_events WHERE asset_id LIKE 'asset-pot%' OR asset_id LIKE 'asset-ley%' OR asset_id LIKE 'asset-estratif%' OR connector_id = 'connector-demo'")
            .execute(pool).await;
        let _ = sqlx::query("DELETE FROM assets WHERE id LIKE 'asset-pot%' OR id LIKE 'asset-ley%' OR id LIKE 'asset-estratif%' OR connector_id = 'connector-demo'")
            .execute(pool).await;
        Ok(())
    }

    /// Comprueba si la base de datos tiene datos; si no, inserta las semillas.
    pub async fn seed_if_empty(&self) -> Result<(), String> {
        let count: i64 = sqlx::query("SELECT COUNT(*) FROM workspaces")
            .fetch_one(&self.pool)
            .await
            .map_err(|e| format!("Error contando assets: {e}"))?
            .get(0);

        if count == 0 {
            let now = Self::unix_now();
            sqlx::query(
                "INSERT INTO workspaces (id, project_id, name, description, is_default, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)"
            )
            .bind("workspace-main")
            .bind("project-default")
            .bind("Principal")
            .bind("Workspace principal del proyecto")
            .bind(1i64)
            .bind(now)
            .bind(now)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Error creando workspace default: {e}"))?;
        }

        Ok(())
    }

    fn unix_now() -> i64 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64
    }
}
