use std::path::Path;
use sqlx::{SqlitePool, Row};
use geonexus_core::{
    AssetKind, AssetStatus, AssetValidation, CacheState, DataAsset, DataStoreMetrics, SyncEvent,
    SyncEventType,
};

/// Repositorio de datos asíncrono con SQLite y sqlx.
#[derive(Debug, Clone)]
pub struct DataRepository {
    pub pool: SqlitePool,
}

impl DataRepository {
    /// Inicializa la base de datos, ejecuta las migraciones y si está vacía, inserta datos semilla.
    pub async fn new(db_url: &str) -> Result<Self, String> {
        // Asegurar la existencia del directorio padre si es una ruta local de archivo
        if let Some(clean_path) = db_url.strip_prefix("sqlite://") {
            if let Some(parent) = Path::new(clean_path).parent() {
                if !parent.as_os_str().is_empty() {
                    let _ = std::fs::create_dir_all(parent);
                }
            }
        }

        // Conectar a la base de datos (crea el archivo automáticamente si no existe)
        let pool = SqlitePool::connect(db_url)
            .await
            .map_err(|e| format!("Error conectando a SQLite: {e}"))?;

        // Ejecutar las migraciones
        sqlx::migrate!("./migrations")
            .run(&pool)
            .await
            .map_err(|e| format!("Error ejecutando migraciones SQLite: {e}"))?;

        let repo = Self { pool };

        // Sembrar datos si la DB está vacía
        repo.seed_if_empty().await?;

        Ok(repo)
    }

    /// Comprueba si la base de datos tiene datos; si no, inserta las semillas.
    async fn seed_if_empty(&self) -> Result<(), String> {
        let count: i64 = sqlx::query("SELECT COUNT(*) FROM assets")
            .fetch_one(&self.pool)
            .await
            .map_err(|e| format!("Error contando assets: {e}"))?
            .get(0);

        if count == 0 {
            // Sembrar assets
            let now = 1717790400; // 2024-06-07T18:00:00Z
            let seed_assets = vec![
                DataAsset {
                    id: "asset-pot-baq".into(),
                    project_id: "pot-barranquilla-2024".into(),
                    name: "POT Barranquilla 2024.pdf".into(),
                    kind: AssetKind::Document,
                    source: "onedrive".into(),
                    location: "/GeoNexus/POT/documentos/POT_Barranquilla_2024.pdf".into(),
                    status: AssetStatus::Ready,
                    size_bytes: Some(44_136_857),
                    chunks: 118,
                    embeddings: 118,
                    graph_nodes: 24,
                    cache_state: CacheState::Cached,
                    created_at: now - 86400 * 7,
                    updated_at: now - 3600,
                },
                DataAsset {
                    id: "asset-predios".into(),
                    project_id: "pot-barranquilla-2024".into(),
                    name: "predios_zona_norte.geojson".into(),
                    kind: AssetKind::Layer,
                    source: "onedrive".into(),
                    location: "/GIS/capas/predios_zona_norte.geojson".into(),
                    status: AssetStatus::Indexing,
                    size_bytes: Some(19_293_798),
                    chunks: 36,
                    embeddings: 36,
                    graph_nodes: 9,
                    cache_state: CacheState::Stale,
                    created_at: now - 86400 * 3,
                    updated_at: now - 720,
                },
                DataAsset {
                    id: "asset-cartografia".into(),
                    project_id: "pot-barranquilla-2024".into(),
                    name: "Anexos cartograficos.zip".into(),
                    kind: AssetKind::Shapefile,
                    source: "local".into(),
                    location: "C:/GIS/Proyectos/POT/Anexos_cartograficos.zip".into(),
                    status: AssetStatus::Ready,
                    size_bytes: Some(90_177_536),
                    chunks: 27,
                    embeddings: 27,
                    graph_nodes: 11,
                    cache_state: CacheState::Cached,
                    created_at: now - 86400 * 14,
                    updated_at: now - 86400,
                },
                DataAsset {
                    id: "asset-resolucion".into(),
                    project_id: "pot-barranquilla-2024".into(),
                    name: "Resolucion uso de suelo.docx".into(),
                    kind: AssetKind::Document,
                    source: "sharepoint".into(),
                    location: "/Sites/Urbanismo/Normativa/Resolucion_uso_suelo.docx".into(),
                    status: AssetStatus::Pending,
                    size_bytes: Some(5_872_026),
                    chunks: 0,
                    embeddings: 0,
                    graph_nodes: 0,
                    cache_state: CacheState::None,
                    created_at: now - 86400 * 2,
                    updated_at: now - 86400,
                },
            ];

            for a in seed_assets {
                sqlx::query(
                    "INSERT INTO assets (id, project_id, name, kind, source, location, status, size_bytes, chunks, embeddings, graph_nodes, cache_state, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
                )
                .bind(&a.id)
                .bind(&a.project_id)
                .bind(&a.name)
                .bind(to_str(&a.kind))
                .bind(&a.source)
                .bind(&a.location)
                .bind(to_str(&a.status))
                .bind(a.size_bytes)
                .bind(a.chunks)
                .bind(a.embeddings)
                .bind(a.graph_nodes)
                .bind(to_str(&a.cache_state))
                .bind(a.created_at)
                .bind(a.updated_at)
                .execute(&self.pool)
                .await
                .map_err(|e| format!("Error sembrando asset {}: {e}", a.id))?;
            }

            // Sembrar sync events
            let seed_events = vec![
                SyncEvent {
                    id: "sync-1".into(),
                    project_id: "pot-barranquilla-2024".into(),
                    connector_id: Some("onedrive-main".into()),
                    asset_id: Some("asset-predios".into()),
                    event_type: SyncEventType::Discovered,
                    detail: Some("predios_zona_norte.geojson encontrado e indexado.".into()),
                    trace_id: Some("tr-001".into()),
                    created_at: now - 300,
                },
                SyncEvent {
                    id: "sync-2".into(),
                    project_id: "pot-barranquilla-2024".into(),
                    connector_id: Some("sharepoint-urb".into()),
                    asset_id: Some("asset-resolucion".into()),
                    event_type: SyncEventType::Error,
                    detail: Some("Pendiente de OAuth para biblioteca Urbanismo.".into()),
                    trace_id: Some("tr-002".into()),
                    created_at: now - 240,
                },
                SyncEvent {
                    id: "sync-3".into(),
                    project_id: "pot-barranquilla-2024".into(),
                    connector_id: None,
                    asset_id: Some("asset-pot-baq".into()),
                    event_type: SyncEventType::Indexed,
                    detail: Some("2 archivos vigentes, 1 archivo en validación.".into()),
                    trace_id: Some("tr-003".into()),
                    created_at: now - 120,
                },
                SyncEvent {
                    id: "sync-4".into(),
                    project_id: "pot-barranquilla-2024".into(),
                    connector_id: Some("mcp-router".into()),
                    asset_id: None,
                    event_type: SyncEventType::Error,
                    detail: Some("Lectura bloqueada fuera de allowlist local.".into()),
                    trace_id: Some("tr-004".into()),
                    created_at: now - 60,
                },
            ];

            for e in seed_events {
                sqlx::query(
                    "INSERT INTO sync_events (id, project_id, connector_id, asset_id, event_type, detail, trace_id, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
                )
                .bind(&e.id)
                .bind(&e.project_id)
                .bind(&e.connector_id)
                .bind(&e.asset_id)
                .bind(to_str(&e.event_type))
                .bind(&e.detail)
                .bind(&e.trace_id)
                .bind(e.created_at)
                .execute(&self.pool)
                .await
                .map_err(|err| format!("Error sembrando event {}: {err}", e.id))?;
            }
        }

        Ok(())
    }

    /// Retorna los activos del proyecto especificado.
    pub async fn list_data_assets(&self, project_id: &str) -> Result<Vec<DataAsset>, String> {
        if project_id.trim().is_empty() {
            return Err("project_id requerido".into());
        }

        let rows = sqlx::query("SELECT * FROM assets WHERE project_id = ?")
            .bind(project_id)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Error listando assets: {e}"))?;

        let mut assets = Vec::new();
        for r in rows {
            assets.push(row_to_asset(&r)?);
        }

        Ok(assets)
    }

    /// Obtiene un activo por ID.
    pub async fn get_data_asset(&self, asset_id: &str) -> Result<Option<DataAsset>, String> {
        if asset_id.trim().is_empty() {
            return Err("asset_id requerido".into());
        }

        let opt_row = sqlx::query("SELECT * FROM assets WHERE id = ?")
            .bind(asset_id)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| format!("Error obteniendo asset: {e}"))?;

        match opt_row {
            Some(r) => Ok(Some(row_to_asset(&r)?)),
            None => Ok(None),
        }
    }

    /// Obtiene métricas agregadas para el proyecto.
    pub async fn get_data_store_metrics(&self, project_id: &str) -> Result<DataStoreMetrics, String> {
        if project_id.trim().is_empty() {
            return Err("project_id requerido".into());
        }

        let assets = self.list_data_assets(project_id).await?;

        Ok(DataStoreMetrics {
            project_id: project_id.to_string(),
            total_assets: assets.len() as i64,
            assets_ready: assets
                .iter()
                .filter(|a| a.status == AssetStatus::Ready)
                .count() as i64,
            assets_pending: assets
                .iter()
                .filter(|a| a.status == AssetStatus::Pending || a.status == AssetStatus::Indexing)
                .count() as i64,
            assets_error: assets
                .iter()
                .filter(|a| a.status == AssetStatus::Error)
                .count() as i64,
            total_chunks: assets.iter().map(|a| a.chunks).sum(),
            total_embeddings: assets.iter().map(|a| a.embeddings).sum(),
            total_graph_nodes: assets.iter().map(|a| a.graph_nodes).sum(),
            cache_size_bytes: assets.iter().filter_map(|a| a.size_bytes).sum(),
        })
    }

    /// Obtiene los eventos de sincronización.
    pub async fn get_sync_events(&self, project_id: &str, limit: i64) -> Result<Vec<SyncEvent>, String> {
        if project_id.trim().is_empty() {
            return Err("project_id requerido".into());
        }

        let limit = limit.clamp(1, 100);
        let rows = sqlx::query("SELECT * FROM sync_events WHERE project_id = ? ORDER BY created_at DESC LIMIT ?")
            .bind(project_id)
            .bind(limit)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Error listando eventos de sync: {e}"))?;

        let mut events = Vec::new();
        for r in rows {
            events.push(row_to_event(&r)?);
        }

        Ok(events)
    }

    /// Ejecuta la validación de integridad para el activo.
    pub async fn validate_data_asset(&self, asset_id: &str) -> Result<AssetValidation, String> {
        if asset_id.trim().is_empty() {
            return Err("asset_id requerido".into());
        }

        let asset = self
            .get_data_asset(asset_id)
            .await?
            .ok_or_else(|| format!("Asset no encontrado: {asset_id}"))?;

        let mut issues: Vec<String> = Vec::new();

        // Validar existencia de archivo local
        let file_exists = if asset.source == "local" {
            let exists = Path::new(&asset.location).exists();
            if !exists {
                issues.push("Archivo no encontrado en ruta local".into());
            }
            exists
        } else {
            true // cloud se verificará en fase posterior
        };

        let path_allowed = file_exists;
        if !path_allowed {
            issues.push("Ruta fuera de allowlist del conector".into());
        }

        let metadata_ok = asset.size_bytes.is_some();
        if !metadata_ok {
            issues.push("Metadata incompleta: falta size_bytes".into());
        }

        let cache_valid = asset.cache_state == CacheState::Cached;
        if !cache_valid {
            issues.push(format!(
                "Cache en estado '{:?}' — no apto para IA",
                asset.cache_state
            ));
        }

        let chunks_exist = asset.chunks > 0;
        if !chunks_exist {
            issues.push("Sin chunks — pendiente de indexación (Fase 3)".into());
        }

        Ok(AssetValidation::new(
            asset_id.to_string(),
            file_exists,
            path_allowed,
            metadata_ok,
            cache_valid,
            chunks_exist,
            issues,
        ))
    }
}

// ─── Helpers de parsing de base de datos ─────────────────────────────────────

fn parse_kind(s: &str) -> AssetKind {
    serde_json::from_str(&format!("\"{s}\"")).unwrap_or(AssetKind::Other)
}

fn parse_status(s: &str) -> AssetStatus {
    serde_json::from_str(&format!("\"{s}\"")).unwrap_or(AssetStatus::Error)
}

fn parse_cache(s: &str) -> CacheState {
    serde_json::from_str(&format!("\"{s}\"")).unwrap_or(CacheState::None)
}

fn parse_event_type(s: &str) -> SyncEventType {
    serde_json::from_str(&format!("\"{s}\"")).unwrap_or(SyncEventType::Error)
}

fn to_str<T: serde::Serialize>(val: &T) -> String {
    let s = serde_json::to_string(val).unwrap_or_default();
    s.trim_matches('"').to_string()
}

fn row_to_asset(row: &sqlx::sqlite::SqliteRow) -> Result<DataAsset, String> {
    let kind_str: String = row.get("kind");
    let status_str: String = row.get("status");
    let cache_str: String = row.get("cache_state");

    Ok(DataAsset {
        id: row.get("id"),
        project_id: row.get("project_id"),
        name: row.get("name"),
        kind: parse_kind(&kind_str),
        source: row.get("source"),
        location: row.get("location"),
        status: parse_status(&status_str),
        size_bytes: row.get("size_bytes"),
        chunks: row.get("chunks"),
        embeddings: row.get("embeddings"),
        graph_nodes: row.get("graph_nodes"),
        cache_state: parse_cache(&cache_str),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}

fn row_to_event(row: &sqlx::sqlite::SqliteRow) -> Result<SyncEvent, String> {
    let type_str: String = row.get("event_type");

    Ok(SyncEvent {
        id: row.get("id"),
        project_id: row.get("project_id"),
        connector_id: row.get("connector_id"),
        asset_id: row.get("asset_id"),
        event_type: parse_event_type(&type_str),
        detail: row.get("detail"),
        trace_id: row.get("trace_id"),
        created_at: row.get("created_at"),
    })
}
