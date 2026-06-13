use tauri::State;
use crate::AppState;
use geonexus_core::{AssetValidation, DataAsset, DataStoreMetrics, SyncEvent, SyncEventType, AssetStatus};
use crate::commands::chat::run_sidecar_json;

#[tauri::command]
pub async fn list_data_assets(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<DataAsset>, String> {
    if project_id.trim().is_empty() {
        return Err("project_id requerido".into());
    }
    state.repo.list_data_assets(&project_id).await
}

#[tauri::command]
pub async fn get_data_asset(
    asset_id: String,
    state: State<'_, AppState>,
) -> Result<Option<DataAsset>, String> {
    if asset_id.trim().is_empty() {
        return Err("asset_id requerido".into());
    }
    state.repo.get_data_asset(&asset_id).await
}

#[tauri::command]
pub async fn get_data_store_metrics(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<DataStoreMetrics, String> {
    if project_id.trim().is_empty() {
        return Err("project_id requerido".into());
    }
    state.repo.get_data_store_metrics(&project_id).await
}

#[tauri::command]
pub async fn get_sync_events(
    project_id: String,
    limit: Option<i64>,
    offset: Option<i64>,
    state: State<'_, AppState>,
) -> Result<Vec<SyncEvent>, String> {
    if project_id.trim().is_empty() {
        return Err("project_id requerido".into());
    }
    let limit = limit.unwrap_or(50).clamp(1, 100);
    let offset = offset.unwrap_or(0).max(0);
    state.repo.get_sync_events(&project_id, limit, offset).await
}

#[tauri::command]
pub async fn validate_data_asset(
    asset_id: String,
    state: State<'_, AppState>,
) -> Result<AssetValidation, String> {
    if asset_id.trim().is_empty() {
        return Err("asset_id requerido".into());
    }
    state.repo.validate_data_asset(&asset_id).await
}

#[tauri::command]
pub async fn delete_data_asset(
    asset_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    if asset_id.trim().is_empty() {
        return Err("asset_id requerido".into());
    }
    state.repo.delete_data_asset(&asset_id).await
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct LineageStep {
    pub step: String,
    pub status: String,
    pub detail: String,
    pub timestamp: Option<i64>,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct DataLineage {
    pub asset_id: String,
    pub asset_name: String,
    pub source: String,
    pub kind: String,
    pub steps: Vec<LineageStep>,
}

/// Devuelve la traza de procesamiento de un asset (lineage).
#[tauri::command]
pub async fn get_data_lineage(
    asset_id: String,
    state: State<'_, AppState>,
) -> Result<DataLineage, String> {
    if asset_id.trim().is_empty() {
        return Err("asset_id requerido".into());
    }

    let asset = state
        .repo
        .get_data_asset(&asset_id)
        .await?
        .ok_or_else(|| format!("Activo no encontrado: {asset_id}"))?;

    let mut steps: Vec<LineageStep> = Vec::new();

    // Step 1: Source / Connector
    let source_label = match asset.source.as_str() {
        "onedrive" => "OneDrive",
        "sharepoint" => "SharePoint",
        "google_drive" => "Google Drive",
        "dropbox" => "Dropbox",
        s => s,
    };
    let source_detail = if let Some(ref cid) = asset.connector_id {
        format!("Conector: {cid}")
    } else {
        "Fuente directa".to_string()
    };
    steps.push(LineageStep {
        step: format!("Origen ({source_label})"),
        status: "done".into(),
        detail: source_detail,
        timestamp: Some(asset.created_at),
    });

    // Step 2: Cache
    if asset.cache_state != geonexus_core::CacheState::None {
        steps.push(LineageStep {
            step: "Cache local".into(),
            status: "done".into(),
            detail: format!("Estado: {:?}", asset.cache_state),
            timestamp: Some(asset.updated_at),
        });
    }

    // Step 3: Indexer
    let indexer = match asset.kind {
        geonexus_core::AssetKind::Document => "Extractor PDF/DOCX",
        geonexus_core::AssetKind::Layer | geonexus_core::AssetKind::Shapefile => "Indexador GIS",
        geonexus_core::AssetKind::Csv => "Parser CSV",
        geonexus_core::AssetKind::Raster => "Indexador Raster",
        _ => "Indexador genérico",
    };
    let index_status = match asset.status {
        AssetStatus::Ready => "done",
        AssetStatus::Error => "error",
        AssetStatus::Indexing => "running",
        _ => "pending",
    };
    steps.push(LineageStep {
        step: indexer.to_string(),
        status: index_status.to_string(),
        detail: format!("{} chunks generados", asset.chunks),
        timestamp: Some(asset.updated_at),
    });

    // Step 4: ChromaDB (embeddings)
    if asset.embeddings > 0 {
        steps.push(LineageStep {
            step: "ChromaDB (vectores)".into(),
            status: "done".into(),
            detail: format!("{} vectores generados", asset.embeddings),
            timestamp: Some(asset.updated_at),
        });
    }

    // Step 5: Knowledge Graph
    if asset.graph_nodes > 0 {
        steps.push(LineageStep {
            step: "Knowledge Graph".into(),
            status: "done".into(),
            detail: format!("{} nodos generados", asset.graph_nodes),
            timestamp: Some(asset.updated_at),
        });
    }

    let kind_str = serde_json::to_string(&asset.kind)
        .unwrap_or_default()
        .trim_matches('"')
        .to_string();
    Ok(DataLineage {
        asset_id: asset.id.clone(),
        asset_name: asset.name.clone(),
        source: asset.source.clone(),
        kind: kind_str,
        steps,
    })
}

/// Re-indexa un asset: resetea su estado y ejecuta el pipeline de indexación.
#[tauri::command]
pub async fn reindex_asset(
    asset_id: String,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    if asset_id.trim().is_empty() {
        return Err("asset_id requerido".into());
    }

    let asset = state
        .repo
        .get_data_asset(&asset_id)
        .await?
        .ok_or_else(|| format!("Activo no encontrado: {asset_id}"))?;

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;

    // Resetear estado del asset
    state.repo.update_asset_indexing_result(
        &asset.id,
        AssetStatus::Pending,
        0, 0, 0, now,
    ).await?;

    // Marcar como Indexing
    state.repo.update_asset_indexing_result(
        &asset.id,
        AssetStatus::Indexing,
        0, 0, 0, now,
    ).await?;

    // Ejecutar pipeline de indexación vía sidecar Python
    let result: serde_json::Value = run_sidecar_json(&[
        "--action", "index",
        "--file", &asset.location,
        "--project_id", &asset.project_id,
        "--workspace_id", asset.workspace_id.as_deref().unwrap_or(""),
        "--asset_id", &asset.id,
    ])?;

    let chunks_count = result["chunks"].as_array().map(|a| a.len() as i64).unwrap_or(0);
    let embeddings = result["embeddings_count"].as_i64().unwrap_or(0);
    let graph_nodes_count = result["graph_nodes"].as_array().map(|a| a.len() as i64).unwrap_or(0);

    state.repo.update_asset_indexing_result(
        &asset.id,
        AssetStatus::Ready,
        chunks_count,
        embeddings,
        graph_nodes_count,
        now,
    ).await?;

    // Registrar evento de sync
    use crate::commands::document::helpers::insert_sync_event;
    insert_sync_event(
        &state.db,
        &asset.project_id,
        asset.workspace_id.as_deref(),
        asset.connector_id.as_deref(),
        Some(&asset.id),
        SyncEventType::Indexed,
        Some(format!("Re-indexado: {chunks_count} chunks, {embeddings} embeddings")),
        None,
    ).await;

    Ok(chunks_count)
}
