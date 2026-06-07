use geonexus_core::{
    DataAsset, DataAssetKind, DataAssetStatus, DataStoreMetric, DataStoreSnapshot,
    DataStoreStatus, SyncEvent, SyncEventStatus,
};

#[derive(Debug, Clone)]
pub struct DataRepository {
    snapshot: DataStoreSnapshot,
}

impl DataRepository {
    pub fn seeded() -> Self {
        Self {
            snapshot: DataStoreSnapshot {
                assets: seed_assets(),
                stores: seed_stores(),
                sync_events: seed_sync_events(),
            },
        }
    }

    pub fn list_data_assets(&self, _project_id: &str) -> Vec<DataAsset> {
        self.snapshot.assets.clone()
    }

    pub fn get_data_asset(&self, asset_id: &str) -> Option<DataAsset> {
        self.snapshot
            .assets
            .iter()
            .find(|asset| asset.id == asset_id)
            .cloned()
    }

    pub fn get_data_store_metrics(&self, _project_id: &str) -> Vec<DataStoreMetric> {
        self.snapshot.stores.clone()
    }

    pub fn get_sync_events(&self, _project_id: &str) -> Vec<SyncEvent> {
        self.snapshot.sync_events.clone()
    }
}

fn seed_assets() -> Vec<DataAsset> {
    vec![
        DataAsset {
            id: "asset-pot-baq".into(),
            name: "POT Barranquilla 2024.pdf".into(),
            kind: DataAssetKind::Pdf,
            source: "OneDrive".into(),
            location: "/GeoNexus/POT/documentos".into(),
            status: DataAssetStatus::Indexed,
            updated: "Hoy 10:45".into(),
            size: "42.1 MB".into(),
            chunks: 118,
            embeddings: 118,
            graph_nodes: 24,
            cache_state: "Cache cifrado vigente".into(),
            lineage: vec![
                "OneDrive".into(),
                "Cache local".into(),
                "Extractor PDF".into(),
                "ChromaDB".into(),
                "Knowledge Graph".into(),
            ],
        },
        DataAsset {
            id: "asset-predios".into(),
            name: "predios_zona_norte.geojson".into(),
            kind: DataAssetKind::GeoJson,
            source: "OneDrive".into(),
            location: "/GIS/capas".into(),
            status: DataAssetStatus::Syncing,
            updated: "Hace 12 min".into(),
            size: "18.4 MB".into(),
            chunks: 36,
            embeddings: 36,
            graph_nodes: 9,
            cache_state: "ETag remoto en validacion".into(),
            lineage: vec![
                "OneDrive".into(),
                "containers-mcp".into(),
                "MapStore".into(),
                "ChromaDB".into(),
                "Grafo".into(),
            ],
        },
        DataAsset {
            id: "asset-cartografia".into(),
            name: "Anexos cartograficos.zip".into(),
            kind: DataAssetKind::Gis,
            source: "Carpeta local".into(),
            location: "C:/GIS/Proyectos/POT".into(),
            status: DataAssetStatus::Indexed,
            updated: "Ayer".into(),
            size: "86.0 MB".into(),
            chunks: 27,
            embeddings: 27,
            graph_nodes: 11,
            cache_state: "Archivo local allowlist".into(),
            lineage: vec![
                "Carpeta local".into(),
                "Indexador GIS".into(),
                "Capas".into(),
                "Knowledge Graph".into(),
            ],
        },
        DataAsset {
            id: "asset-resolucion".into(),
            name: "Resolucion uso de suelo.docx".into(),
            kind: DataAssetKind::Pdf,
            source: "SharePoint".into(),
            location: "/Sites/Urbanismo/Normativa".into(),
            status: DataAssetStatus::Pending,
            updated: "Ayer".into(),
            size: "5.6 MB".into(),
            chunks: 0,
            embeddings: 0,
            graph_nodes: 0,
            cache_state: "Esperando OAuth".into(),
            lineage: vec![
                "SharePoint".into(),
                "OAuth".into(),
                "Extractor DOCX".into(),
                "ChromaDB".into(),
            ],
        },
    ]
}

fn seed_stores() -> Vec<DataStoreMetric> {
    vec![
        DataStoreMetric {
            name: "SQLite metadata".into(),
            role: "Inventario, rutas, ETags y sync logs".into(),
            value: "4 assets".into(),
            detail: "Sin tokens; solo metadata operativa.".into(),
            status: DataStoreStatus::Simulated,
        },
        DataStoreMetric {
            name: "Cache cifrado".into(),
            role: "Archivos descargados para modo offline".into(),
            value: "146 MB".into(),
            detail: "AES-256-GCM, limite objetivo 5 GB.".into(),
            status: DataStoreStatus::Simulated,
        },
        DataStoreMetric {
            name: "ChromaDB".into(),
            role: "Embeddings y busqueda semantica".into(),
            value: "181 vectores".into(),
            detail: "Alimenta recall y respuestas citadas.".into(),
            status: DataStoreStatus::Simulated,
        },
        DataStoreMetric {
            name: "Knowledge Graph".into(),
            role: "Relaciones norma-zona-capa-documento".into(),
            value: "44 nodos".into(),
            detail: "Contexto relacional para GeoNexus IA.".into(),
            status: DataStoreStatus::Simulated,
        },
    ]
}

fn seed_sync_events() -> Vec<SyncEvent> {
    vec![
        SyncEvent {
            id: "sync-1".into(),
            source: "OneDrive".into(),
            operation: "container_search".into(),
            status: SyncEventStatus::Ok,
            detail: "predios_zona_norte.geojson encontrado e indexado.".into(),
            time: "18:41".into(),
        },
        SyncEvent {
            id: "sync-2".into(),
            source: "SharePoint".into(),
            operation: "container_list".into(),
            status: SyncEventStatus::Queued,
            detail: "Pendiente de OAuth para biblioteca Urbanismo.".into(),
            time: "18:42".into(),
        },
        SyncEvent {
            id: "sync-3".into(),
            source: "Cache".into(),
            operation: "etag_check".into(),
            status: SyncEventStatus::Ok,
            detail: "2 archivos vigentes, 1 archivo en validacion.".into(),
            time: "18:44".into(),
        },
        SyncEvent {
            id: "sync-4".into(),
            source: "MCP".into(),
            operation: "container_get".into(),
            status: SyncEventStatus::Blocked,
            detail: "Lectura bloqueada fuera de allowlist local.".into(),
            time: "18:45".into(),
        },
    ]
}
