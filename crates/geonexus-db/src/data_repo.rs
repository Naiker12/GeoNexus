use std::path::Path;
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::{ConnectOptions, SqlitePool, Row};
use geonexus_core::{
    AssetKind, AssetStatus, AssetValidation, CacheState, DataAsset, DataStoreMetrics, SyncEvent,
    SyncEventType, DocumentChunk, GraphNode, GraphEdge,
};
use geonexus_core::allowlist::ruta_segura;

/// Repositorio de datos asíncrono con SQLite y sqlx.
#[derive(Debug, Clone)]
pub struct DataRepository {
    pub pool: SqlitePool,
}

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

        // Sembrar datos si la DB está vacía
        repo.seed_if_empty().await?;

        Ok(repo)
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

        // Sembrar nodos de conocimiento por defecto si el grafo está vacío
        let graph_count: i64 = sqlx::query("SELECT COUNT(*) FROM graph_nodes")
            .fetch_one(&self.pool)
            .await
            .map_err(|e| format!("Error contando nodos: {e}"))?
            .get(0);

        if graph_count == 0 {
            let now = Self::unix_now();
            let nodes = vec![
                ("node-norma-1", "Artículo 45 - Usos del suelo", "norma", "Clasificación de usos del suelo: residencial, comercial, industrial. Artículo 45 del POT.", "POT Municipal 2024", 10.0, 10.0, 3),
                ("node-norma-2", "Artículo 78 - Alturas máximas", "norma", "Alturas máximas permitidas por zona: Z1=3 pisos, Z2=5 pisos, Z3=8 pisos.", "POT Municipal 2024", 30.0, 15.0, 2),
                ("node-zona-1", "Zona Residencial Z1",   "zona", "Zona de baja densidad: máximo 3 pisos, uso residencial exclusivo.", "POT Municipal 2024", 15.0, 30.0, 2),
                ("node-zona-2", "Zona Comercial Z2",     "zona", "Zona mixta comercial-residencial: máximo 5 pisos.", "POT Municipal 2024", 35.0, 35.0, 2),
                ("node-concepto-1", "Suelo urbano", "concepto", "Suelo dentro del perímetro urbano con servicios públicos domiciliarios.", "Ley 388 de 1997", 50.0, 20.0, 1),
                ("node-concepto-2", "Cesión urbanística", "concepto", "Porcentaje de suelo que debe cederse al municipio para espacio público.", "POT Municipal 2024", 55.0, 40.0, 1),
                ("node-capa-1", "Capa de estratificación", "capa", "Estratificación socioeconómica por manzanas catastrales.", "DANE - Estratificación", 70.0, 25.0, 1),
            ];
            for (id, name, kind, description, evidence, x, y, weight) in &nodes {
                sqlx::query(
                    "INSERT INTO graph_nodes (id, project_id, workspace_id, name, kind, description, evidence, x, y, weight, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                     ON CONFLICT(id) DO NOTHING"
                )
                .bind(id)
                .bind("project-default")
                .bind(Some("workspace-main"))
                .bind(name)
                .bind(kind)
                .bind(description)
                .bind(evidence)
                .bind(x)
                .bind(y)
                .bind(weight)
                .bind(now)
                .execute(&self.pool)
                .await
                .map_err(|e| format!("Error sembrando nodo {id}: {e}"))?;
            }

            // Sembrar aristas por defecto
            let edges = vec![
                ("edge-1", "node-norma-1", "node-zona-1", "regula"),
                ("edge-2", "node-norma-1", "node-zona-2", "regula"),
                ("edge-3", "node-norma-2", "node-zona-1", "restringe"),
                ("edge-4", "node-norma-2", "node-zona-2", "restringe"),
                ("edge-5", "node-zona-1", "node-concepto-1", "clasifica"),
                ("edge-6", "node-concepto-2", "node-zona-2", "aplica"),
                ("edge-7", "node-capa-1", "node-zona-1", "interseca"),
                ("edge-8", "node-capa-1", "node-zona-2", "interseca"),
            ];
            for (id, source, target, relation) in &edges {
                sqlx::query(
                    "INSERT INTO graph_edges (id, project_id, source, target, relation, strength, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?)
                     ON CONFLICT(id) DO NOTHING"
                )
                .bind(id)
                .bind("project-default")
                .bind(source)
                .bind(target)
                .bind(relation)
                .bind(70i64)
                .bind(now)
                .execute(&self.pool)
                .await
                .map_err(|e| format!("Error sembrando arista {id}: {e}"))?;
            }
        }

        Ok(())
    }

    /// Inserta datos de demostración para ver la UI con contenido real.
    pub async fn seed_demo_data(&self) -> Result<(), String> {
        let now = Self::unix_now();
        let pid = "project-default";

        // 3 activos de demostración
        let demo_assets = vec![
            DataAsset {
                id: "asset-pot-2024".into(),
                project_id: pid.into(),
                workspace_id: Some("workspace-main".into()),
                name: "Plan de Ordenamiento Territorial 2024".into(),
                kind: AssetKind::Document,
                source: "local".into(),
                location: "/data/pot-2024.pdf".into(),
                agent_id: None,
                connector_id: Some("connector-demo".into()),
                status: AssetStatus::Ready,
                size_bytes: Some(2_450_000),
                chunks: 24,
                embeddings: 24,
                graph_nodes: 3,
                cache_state: CacheState::Cached,
                trace_id: Some("trace-pot".into()),
                created_at: now - 86400,
                updated_at: now - 3600,
            },
            DataAsset {
                id: "asset-ley-388".into(),
                project_id: pid.into(),
                workspace_id: Some("workspace-main".into()),
                name: "Ley 388 de 1997".into(),
                kind: AssetKind::Document,
                source: "local".into(),
                location: "/data/ley-388.pdf".into(),
                agent_id: None,
                connector_id: Some("connector-demo".into()),
                status: AssetStatus::Ready,
                size_bytes: Some(890_000),
                chunks: 12,
                embeddings: 12,
                graph_nodes: 2,
                cache_state: CacheState::Cached,
                trace_id: Some("trace-ley388".into()),
                created_at: now - 172800,
                updated_at: now - 7200,
            },
            DataAsset {
                id: "asset-estratificacion".into(),
                project_id: pid.into(),
                workspace_id: Some("workspace-main".into()),
                name: "Estratificación por manzanas 2025".into(),
                kind: AssetKind::Layer,
                source: "local".into(),
                location: "/data/estratificacion.geojson".into(),
                agent_id: None,
                connector_id: Some("connector-demo".into()),
                status: AssetStatus::Pending,
                size_bytes: Some(320_000),
                chunks: 0,
                embeddings: 0,
                graph_nodes: 1,
                cache_state: CacheState::None,
                trace_id: None,
                created_at: now - 300,
                updated_at: now - 300,
            },
        ];

        for asset in &demo_assets {
            self.upsert_data_asset(asset).await?;
        }

        // Eventos de sincronización de demostración
        let demo_events = vec![
            SyncEvent {
                id: "evt-discover-1".into(),
                project_id: pid.into(),
                workspace_id: Some("workspace-main".into()),
                connector_id: Some("connector-demo".into()),
                asset_id: None,
                agent_id: None,
                event_type: SyncEventType::Discovered,
                detail: Some("12 archivos descubiertos en carpeta POT 2024".into()),
                trace_id: Some("trace-pot".into()),
                created_at: now - 86400,
            },
            SyncEvent {
                id: "evt-index-1".into(),
                project_id: pid.into(),
                workspace_id: Some("workspace-main".into()),
                connector_id: Some("connector-demo".into()),
                asset_id: Some("asset-pot-2024".into()),
                agent_id: Some("agent-indexer".into()),
                event_type: SyncEventType::Indexed,
                detail: Some("Indexado: Plan de Ordenamiento Territorial 2024 — 24 chunks".into()),
                trace_id: Some("trace-pot".into()),
                created_at: now - 3600,
            },
            SyncEvent {
                id: "evt-embed-1".into(),
                project_id: pid.into(),
                workspace_id: Some("workspace-main".into()),
                connector_id: Some("connector-demo".into()),
                asset_id: Some("asset-pot-2024".into()),
                agent_id: Some("agent-embedder".into()),
                event_type: SyncEventType::Embedded,
                detail: Some("24 embeddings generados para POT 2024".into()),
                trace_id: Some("trace-pot".into()),
                created_at: now - 3500,
            },
            SyncEvent {
                id: "evt-graph-1".into(),
                project_id: pid.into(),
                workspace_id: Some("workspace-main".into()),
                connector_id: Some("connector-demo".into()),
                asset_id: Some("asset-pot-2024".into()),
                agent_id: Some("agent-graph".into()),
                event_type: SyncEventType::GraphLinked,
                detail: Some("3 nodos enlazados al grafo de conocimiento".into()),
                trace_id: Some("trace-pot".into()),
                created_at: now - 3400,
            },
            SyncEvent {
                id: "evt-error-1".into(),
                project_id: pid.into(),
                workspace_id: Some("workspace-main".into()),
                connector_id: None,
                asset_id: Some("asset-estratificacion".into()),
                agent_id: None,
                event_type: SyncEventType::Error,
                detail: Some("Formato no soportado para indexación automática".into()),
                trace_id: Some("trace-error".into()),
                created_at: now - 300,
            },
        ];

        for event in &demo_events {
            sqlx::query(
                "INSERT INTO sync_events (id, project_id, workspace_id, connector_id, asset_id, agent_id, event_type, detail, trace_id, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(id) DO NOTHING"
            )
            .bind(&event.id)
            .bind(&event.project_id)
            .bind(&event.workspace_id)
            .bind(&event.connector_id)
            .bind(&event.asset_id)
            .bind(&event.agent_id)
            .bind(to_str(&event.event_type))
            .bind(&event.detail)
            .bind(&event.trace_id)
            .bind(event.created_at)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Error insertando evento demo: {e}"))?;
        }

        Ok(())
    }

    fn unix_now() -> i64 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64
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
    /// Consulta las tablas reales (document_chunks, graph_nodes) en vez de solo
    /// los contadores de la tabla assets, para reflejar datos aunque no haya assets.
    pub async fn get_data_store_metrics(&self, project_id: &str) -> Result<DataStoreMetrics, String> {
        if project_id.trim().is_empty() {
            return Err("project_id requerido".into());
        }

        let pool = &self.pool;

        // Assets — conteo directo con filtro por estado
        let total_assets: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM assets WHERE project_id = ?"
        )
            .bind(project_id)
            .fetch_one(pool)
            .await
            .unwrap_or(0);

        let assets_ready: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM assets WHERE project_id = ? AND status = 'ready'"
        )
            .bind(project_id)
            .fetch_one(pool)
            .await
            .unwrap_or(0);

        let assets_error: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM assets WHERE project_id = ? AND status = 'error'"
        )
            .bind(project_id)
            .fetch_one(pool)
            .await
            .unwrap_or(0);

        // Chunks reales en document_chunks (JOIN con assets por project_id)
        let total_chunks: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM document_chunks
             WHERE asset_id IN (SELECT id FROM assets WHERE project_id = ?)"
        )
            .bind(project_id)
            .fetch_one(pool)
            .await
            .unwrap_or(0);

        // Embeddings — se usa SUM de la columna contador de assets
        // (no hay tabla de embeddings independiente)
        let total_embeddings: i64 = sqlx::query_scalar(
            "SELECT COALESCE(SUM(embeddings), 0) FROM assets WHERE project_id = ?"
        )
            .bind(project_id)
            .fetch_one(pool)
            .await
            .unwrap_or(0);

        // Nodos del grafo — consulta directa a graph_nodes
        let total_graph_nodes: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM graph_nodes WHERE project_id = ?"
        )
            .bind(project_id)
            .fetch_one(pool)
            .await
            .unwrap_or(0);

        // Cache — suma de size_bytes de assets
        let cache_size_bytes: i64 = sqlx::query_scalar(
            "SELECT COALESCE(SUM(size_bytes), 0) FROM assets WHERE project_id = ?"
        )
            .bind(project_id)
            .fetch_one(pool)
            .await
            .unwrap_or(0);

        let assets_pending = total_assets - assets_ready - assets_error;

        Ok(DataStoreMetrics {
            project_id: project_id.to_string(),
            total_assets,
            assets_ready,
            assets_pending,
            assets_error,
            total_chunks,
            total_embeddings,
            total_graph_nodes,
            cache_size_bytes,
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
    async fn local_connector_root(&self, connector_id: Option<&str>) -> Result<Option<String>, String> {
        let Some(connector_id) = connector_id else {
            return Ok(None);
        };

        let row = sqlx::query(
            "SELECT root_path FROM connector_configs WHERE id = ? AND provider = 'local' AND is_active = 1"
        )
        .bind(connector_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| format!("Error validando allowlist del conector: {e}"))?;

        Ok(row.and_then(|r| r.get("root_path")))
    }

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

        let path_allowed = if asset.source == "local" {
            match self.local_connector_root(asset.connector_id.as_deref()).await? {
                Some(root_path) => ruta_segura(&root_path, &asset.location).is_ok(),
                None => false,
            }
        } else {
            true
        };
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

    /// Guarda un fragmento (chunk) en la base de datos.
    pub async fn insert_document_chunks(&self, chunks: &[DocumentChunk]) -> Result<(), String> {
        for chunk in chunks {
            sqlx::query(
                "INSERT INTO document_chunks (id, asset_id, chunk_index, content, token_count, page_number, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(id) DO UPDATE SET
                    content     = excluded.content,
                    token_count = excluded.token_count,
                    page_number = excluded.page_number"
            )
            .bind(&chunk.id)
            .bind(&chunk.asset_id)
            .bind(chunk.chunk_index)
            .bind(&chunk.content)
            .bind(chunk.token_count)
            .bind(chunk.page_number)
            .bind(chunk.created_at)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Error insertando chunk: {e}"))?;
        }
        Ok(())
    }

    /// Lista los fragmentos (chunks) de un activo ordenados por su índice.
    pub async fn list_document_chunks(&self, asset_id: &str) -> Result<Vec<DocumentChunk>, String> {
        let rows = sqlx::query("SELECT * FROM document_chunks WHERE asset_id = ? ORDER BY chunk_index ASC")
            .bind(asset_id)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Error listando chunks: {e}"))?;

        let mut list = Vec::new();
        for r in rows {
            list.push(row_to_chunk(&r)?);
        }
        Ok(list)
    }

    /// Elimina todos los fragmentos (chunks) asociados a un activo.
    pub async fn delete_document_chunks(&self, asset_id: &str) -> Result<(), String> {
        sqlx::query("DELETE FROM document_chunks WHERE asset_id = ?")
            .bind(asset_id)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Error eliminando chunks del asset: {e}"))?;
        Ok(())
    }

    /// Inserta o actualiza un activo de datos directamente (útil para registrar nuevos assets).
    pub async fn upsert_data_asset(&self, asset: &DataAsset) -> Result<(), String> {
        sqlx::query(
            "INSERT INTO assets (id, project_id, workspace_id, name, kind, source, location, agent_id, connector_id, status, size_bytes, chunks, embeddings, graph_nodes, cache_state, trace_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
                status      = excluded.status,
                size_bytes  = excluded.size_bytes,
                chunks      = excluded.chunks,
                embeddings  = excluded.embeddings,
                graph_nodes = excluded.graph_nodes,
                cache_state = excluded.cache_state,
                trace_id    = excluded.trace_id,
                updated_at  = excluded.updated_at"
        )
        .bind(&asset.id)
        .bind(&asset.project_id)
        .bind(&asset.workspace_id)
        .bind(&asset.name)
        .bind(to_str(&asset.kind))
        .bind(&asset.source)
        .bind(&asset.location)
        .bind(&asset.agent_id)
        .bind(&asset.connector_id)
        .bind(to_str(&asset.status))
        .bind(asset.size_bytes)
        .bind(asset.chunks)
        .bind(asset.embeddings)
        .bind(asset.graph_nodes)
        .bind(to_str(&asset.cache_state))
        .bind(&asset.trace_id)
        .bind(asset.created_at)
        .bind(asset.updated_at)
        .execute(&self.pool)
        .await
        .map_err(|e| format!("Error en upsert_data_asset: {e}"))?;
        Ok(())
    }

    /// Actualiza el estado y los contadores de indexación de un activo.
    pub async fn update_asset_indexing_result(
        &self,
        asset_id: &str,
        status: AssetStatus,
        chunks: i64,
        embeddings: i64,
        graph_nodes: i64,
        updated_at: i64,
    ) -> Result<(), String> {
        sqlx::query(
            "UPDATE assets 
             SET status = ?, chunks = ?, embeddings = ?, graph_nodes = ?, updated_at = ?
             WHERE id = ?"
        )
        .bind(to_str(&status))
        .bind(chunks)
        .bind(embeddings)
        .bind(graph_nodes)
        .bind(updated_at)
        .bind(asset_id)
        .execute(&self.pool)
        .await
        .map_err(|e| format!("Error actualizando resultado de indexación del asset: {e}"))?;
        Ok(())
    }

    /// Inserta una lista de nodos en el grafo de conocimiento.
    pub async fn insert_graph_nodes(&self, nodes: &[GraphNode]) -> Result<(), String> {
        for node in nodes {
            sqlx::query(
                "INSERT INTO graph_nodes (id, project_id, workspace_id, name, kind, description, evidence, x, y, weight, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(id) DO UPDATE SET
                    name        = excluded.name,
                    kind        = excluded.kind,
                    description = excluded.description,
                    evidence    = excluded.evidence,
                    weight      = MAX(graph_nodes.weight, excluded.weight)"
            )
            .bind(&node.id)
            .bind(&node.project_id)
            .bind(&node.workspace_id)
            .bind(&node.name)
            .bind(&node.kind)
            .bind(&node.description)
            .bind(&node.evidence)
            .bind(node.x)
            .bind(node.y)
            .bind(node.weight)
            .bind(node.created_at)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Error insertando nodo de grafo: {e}"))?;
        }
        Ok(())
    }

    /// Obtiene todos los nodos del grafo para un proyecto.
    pub async fn list_graph_nodes(&self, project_id: &str) -> Result<Vec<GraphNode>, String> {
        let rows = sqlx::query("SELECT * FROM graph_nodes WHERE project_id = ?")
            .bind(project_id)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Error listando nodos de grafo: {e}"))?;

        let mut list = Vec::new();
        for r in rows {
            list.push(row_to_node(&r)?);
        }
        Ok(list)
    }

    /// Inserta una lista de aristas en el grafo de conocimiento.
    pub async fn insert_graph_edges(&self, edges: &[GraphEdge]) -> Result<(), String> {
        for edge in edges {
            sqlx::query(
                "INSERT INTO graph_edges (id, project_id, source, target, relation, strength, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(id) DO UPDATE SET
                    relation = excluded.relation,
                    strength = excluded.strength"
            )
            .bind(&edge.id)
            .bind(&edge.project_id)
            .bind(&edge.source)
            .bind(&edge.target)
            .bind(&edge.relation)
            .bind(edge.strength)
            .bind(edge.created_at)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Error insertando arista de grafo: {e}"))?;
        }
        Ok(())
    }

    /// Obtiene todas las aristas/relaciones del grafo para un proyecto.
    pub async fn list_graph_edges(&self, project_id: &str) -> Result<Vec<GraphEdge>, String> {
        let rows = sqlx::query("SELECT * FROM graph_edges WHERE project_id = ?")
            .bind(project_id)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Error listando aristas de grafo: {e}"))?;

        let mut list = Vec::new();
        for r in rows {
            list.push(row_to_edge(&r)?);
        }
        Ok(list)
    }

    /// Vacía todo el grafo de un proyecto (nodos y aristas asociados se eliminan por CASCADE).
    pub async fn clear_graph(&self, project_id: &str) -> Result<(), String> {
        sqlx::query("DELETE FROM graph_nodes WHERE project_id = ?")
            .bind(project_id)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Error vaciando grafo de proyecto: {e}"))?;
        Ok(())
    }

    /// Actualiza la posicion de un nodo en el canvas (arrastre del usuario).
    pub async fn update_node_position(&self, node_id: &str, x: f64, y: f64) -> Result<(), String> {
        sqlx::query("UPDATE graph_nodes SET x = ?, y = ? WHERE id = ?")
            .bind(x)
            .bind(y)
            .bind(node_id)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Error actualizando posicion de nodo: {e}"))?;
        Ok(())
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
        workspace_id: row.get("workspace_id"),
        name: row.get("name"),
        kind: parse_kind(&kind_str),
        source: row.get("source"),
        location: row.get("location"),
        agent_id: row.get("agent_id"),
        connector_id: row.get("connector_id"),
        status: parse_status(&status_str),
        size_bytes: row.get("size_bytes"),
        chunks: row.get("chunks"),
        embeddings: row.get("embeddings"),
        graph_nodes: row.get("graph_nodes"),
        cache_state: parse_cache(&cache_str),
        trace_id: row.get("trace_id"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}

fn row_to_event(row: &sqlx::sqlite::SqliteRow) -> Result<SyncEvent, String> {
    let type_str: String = row.get("event_type");

    Ok(SyncEvent {
        id: row.get("id"),
        project_id: row.get("project_id"),
        workspace_id: row.get("workspace_id"),
        connector_id: row.get("connector_id"),
        asset_id: row.get("asset_id"),
        agent_id: row.get("agent_id"),
        event_type: parse_event_type(&type_str),
        detail: row.get("detail"),
        trace_id: row.get("trace_id"),
        created_at: row.get("created_at"),
    })
}

fn row_to_chunk(row: &sqlx::sqlite::SqliteRow) -> Result<DocumentChunk, String> {
    Ok(DocumentChunk {
        id: row.get("id"),
        asset_id: row.get("asset_id"),
        chunk_index: row.get("chunk_index"),
        content: row.get("content"),
        token_count: row.get("token_count"),
        page_number: row.get("page_number"),
        created_at: row.get("created_at"),
    })
}

fn row_to_node(row: &sqlx::sqlite::SqliteRow) -> Result<GraphNode, String> {
    Ok(GraphNode {
        id: row.get("id"),
        project_id: row.get("project_id"),
        workspace_id: row.get("workspace_id"),
        name: row.get("name"),
        kind: row.get("kind"),
        description: row.get("description"),
        evidence: row.get("evidence"),
        x: row.get("x"),
        y: row.get("y"),
        weight: row.get("weight"),
        created_at: row.get("created_at"),
    })
}

fn row_to_edge(row: &sqlx::sqlite::SqliteRow) -> Result<GraphEdge, String> {
    Ok(GraphEdge {
        id: row.get("id"),
        project_id: row.get("project_id"),
        source: row.get("source"),
        target: row.get("target"),
        relation: row.get("relation"),
        strength: row.get("strength"),
        created_at: row.get("created_at"),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePoolOptions;

    async fn db_en_memoria() -> sqlx::SqlitePool {
        let pool = SqlitePoolOptions::new()
            .connect("sqlite::memory:")
            .await
            .unwrap();
        sqlx::migrate!("./migrations").run(&pool).await.unwrap();
        pool
    }

    #[tokio::test]
    async fn test_document_chunks_crud() {
        let pool = db_en_memoria().await;
        let repo = DataRepository { pool };

        // Insertar un asset de prueba primero (ya que los chunks tienen clave foránea a assets)
        let asset = DataAsset {
            id: "asset1".into(),
            project_id: "proj1".into(),
            workspace_id: Some("work1".into()),
            name: "test.pdf".into(),
            kind: AssetKind::Document,
            source: "local".into(),
            location: "/tmp/test.pdf".into(),
            agent_id: None,
            connector_id: None,
            status: AssetStatus::Pending,
            size_bytes: Some(100),
            chunks: 0,
            embeddings: 0,
            graph_nodes: 0,
            cache_state: CacheState::None,
            trace_id: None,
            created_at: 0,
            updated_at: 0,
        };
        repo.upsert_data_asset(&asset).await.unwrap();

        // Probar inserción de chunks
        let chunks = vec![
            DocumentChunk {
                id: "c1".into(),
                asset_id: "asset1".into(),
                chunk_index: 0,
                content: "hola mundo".into(),
                token_count: 2,
                page_number: Some(1),
                created_at: 100,
            },
            DocumentChunk {
                id: "c2".into(),
                asset_id: "asset1".into(),
                chunk_index: 1,
                content: "adios mundo".into(),
                token_count: 2,
                page_number: Some(2),
                created_at: 100,
            },
        ];
        repo.insert_document_chunks(&chunks).await.unwrap();

        // Probar listado
        let listed = repo.list_document_chunks("asset1").await.unwrap();
        assert_eq!(listed.len(), 2);
        assert_eq!(listed[0].id, "c1");
        assert_eq!(listed[1].content, "adios mundo");

        // Probar eliminación
        repo.delete_document_chunks("asset1").await.unwrap();
        let listed_after = repo.list_document_chunks("asset1").await.unwrap();
        assert!(listed_after.is_empty());
    }

    #[tokio::test]
    async fn test_graph_nodes_and_edges_crud() {
        let pool = db_en_memoria().await;
        let repo = DataRepository { pool };

        let nodes = vec![
            GraphNode {
                id: "n1".into(),
                project_id: "proj1".into(),
                workspace_id: None,
                name: "Node 1".into(),
                kind: "concepto".into(),
                description: "Desc 1".into(),
                evidence: "Ev 1".into(),
                x: 10.0,
                y: 10.0,
                weight: 1,
                created_at: 100,
            },
            GraphNode {
                id: "n2".into(),
                project_id: "proj1".into(),
                workspace_id: None,
                name: "Node 2".into(),
                kind: "norma".into(),
                description: "Desc 2".into(),
                evidence: "Ev 2".into(),
                x: 20.0,
                y: 20.0,
                weight: 2,
                created_at: 100,
            },
        ];
        repo.insert_graph_nodes(&nodes).await.unwrap();

        let edges = vec![
            GraphEdge {
                id: "e1".into(),
                project_id: "proj1".into(),
                source: "n1".into(),
                target: "n2".into(),
                relation: "related".into(),
                strength: 75,
                created_at: 100,
            },
        ];
        repo.insert_graph_edges(&edges).await.unwrap();

        let listed_nodes = repo.list_graph_nodes("proj1").await.unwrap();
        assert_eq!(listed_nodes.len(), 2);

        let listed_edges = repo.list_graph_edges("proj1").await.unwrap();
        assert_eq!(listed_edges.len(), 1);
        assert_eq!(listed_edges[0].source, "n1");

        // Probar vaciado del grafo
        repo.clear_graph("proj1").await.unwrap();
        let listed_nodes_after = repo.list_graph_nodes("proj1").await.unwrap();
        assert!(listed_nodes_after.is_empty());
        let listed_edges_after = repo.list_graph_edges("proj1").await.unwrap();
        assert!(listed_edges_after.is_empty());
    }
}
