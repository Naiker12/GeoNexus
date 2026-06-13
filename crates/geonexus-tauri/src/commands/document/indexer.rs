use tauri::State;
use uuid::Uuid;
use std::time::Duration;
use crate::AppState;
use geonexus_core::{AssetStatus, DocumentChunk, GraphNode, GraphEdge, GraphUpdatePayload, SyncEventType};
use crate::commands::graph_events::emit_graph_update;
use crate::commands::document::helpers::{unix_now, insert_sync_event};

#[derive(serde::Deserialize)]
struct PythonIndexResult {
    status: String,
    message: Option<String>,
    chunks: Vec<PythonChunk>,
    embeddings_count: i64,
    graph_nodes: Vec<PythonGraphNode>,
    graph_edges: Vec<PythonGraphEdge>,
}

#[derive(serde::Deserialize)]
struct PythonChunk {
    chunk_index: i64,
    content: String,
    token_count: i64,
    page_number: Option<i64>,
}

#[derive(serde::Deserialize)]
struct PythonGraphNode {
    id: String,
    name: String,
    kind: String,
    description: String,
    evidence: String,
    x: f64,
    y: f64,
    weight: i64,
}

#[derive(serde::Deserialize)]
struct PythonGraphEdge {
    id: String,
    source: String,
    target: String,
    relation: String,
    strength: i64,
}

/// Orquesta la indexación de un documento de datos: extrae, chunkifica, embeddea y actualiza ChromaDB y el Grafo.
#[tauri::command]
pub async fn index_document(
    document_id: String,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    if document_id.trim().is_empty() {
        return Err("document_id requerido".into());
    }

    // Obtener la metadata del activo desde la base de datos
    let asset = state
        .repo
        .get_data_asset(&document_id)
        .await?
        .ok_or_else(|| format!("Activo no encontrado: {document_id}"))?;

    // Actualizar estado a Indexing para dar feedback en la UI
    state
        .repo
        .update_asset_indexing_result(
            &asset.id,
            AssetStatus::Indexing,
            0,
            0,
            0,
            unix_now(),
        )
        .await?;

    // Determinar la ruta del ejecutable de Python y del script sidecar
    // Buscar el directorio raiz del proyecto que contiene `ai/sidecar.py`
    let mut root_path = std::env::current_dir().unwrap_or_default();
    loop {
        if root_path.join("ai").join("sidecar.py").exists() {
            break;
        }
        if !root_path.pop() {
            root_path = std::env::current_dir().unwrap_or_default();
            break;
        }
    }

    let mut python_exe = "python".to_string();
    let candidates = vec![
        root_path.join("ai").join(".venv").join("Scripts").join("python.exe"),
        root_path.join(".venv").join("Scripts").join("python.exe"),
        root_path.join("ai").join(".venv").join("bin").join("python"),
        root_path.join(".venv").join("bin").join("python"),
    ];

    for c in candidates {
        if c.exists() {
            python_exe = c.to_string_lossy().to_string();
            break;
        }
    }

    let sidecar_script = root_path.join("ai").join("sidecar.py");
    if !sidecar_script.exists() {
        return Err(format!(
            "No se encontró el script sidecar.py en la ruta: {}",
            sidecar_script.display()
        ));
    }

    // Invocar al sidecar de Python para indexar el archivo
    let mut cmd = std::process::Command::new(&python_exe);
    cmd.arg(&sidecar_script)
        .arg("--action")
        .arg("index")
        .arg("--file")
        .arg(&asset.location)
        .arg("--project_id")
        .arg(&asset.project_id)
        .arg("--workspace_id")
        .arg(asset.workspace_id.as_deref().unwrap_or("workspace-main"))
        .arg("--asset_id")
        .arg(&asset.id)
        .current_dir(&root_path);

    let child = cmd.spawn()
        .map_err(|e| format!("Fallo al ejecutar el sidecar de Python: {e}"))?;

    let (tx, rx) = std::sync::mpsc::channel();
    std::thread::spawn(move || {
        let result = child.wait_with_output();
        let _ = tx.send(result);
    });

    let output = match rx.recv_timeout(Duration::from_secs(300)) {
        Ok(result) => result.map_err(|e| format!("Fallo al ejecutar el sidecar de Python: {e}"))?,
        Err(_) => {
            state.repo.update_asset_indexing_result(&asset.id, AssetStatus::Error, 0, 0, 0, unix_now()).await?;
            return Err("El indexador de Python no respondió en 5 minutos".to_string());
        }
    };

    if !output.status.success() {
        let err_msg = String::from_utf8(output.stderr)
            .map_err(|e| format!("stderr del indexador no es UTF-8 válido: {e}"))?;
        let _ = state
            .repo
            .update_asset_indexing_result(
                &asset.id,
                AssetStatus::Error,
                0,
                0,
                0,
                unix_now(),
            )
            .await;
        return Err(format!("Error en el indexador de Python: {err_msg}"));
    }

    let stdout_str = String::from_utf8(output.stdout)
        .map_err(|e| format!("stdout del indexador no es UTF-8 válido: {e}"))?;
    let res: PythonIndexResult = match serde_json::from_str(&stdout_str) {
        Ok(r) => r,
        Err(e) => {
            state.repo.update_asset_indexing_result(&asset.id, AssetStatus::Error, 0, 0, 0, unix_now()).await?;
            return Err(format!("Error deserializando el resultado del indexador: {e}. Output: {stdout_str}"));
        }
    };

    if res.status == "error" {
        let _ = state
            .repo
            .update_asset_indexing_result(
                &asset.id,
                AssetStatus::Error,
                0,
                0,
                0,
                unix_now(),
            )
            .await;
        return Err(res.message.unwrap_or_else(|| "Error desconocido en indexación".to_string()));
    }

    // Limpiar chunks antiguos si existieran
    state.repo.delete_document_chunks(&asset.id).await?;

    // Guardar los nuevos chunks en SQLite
    let now = unix_now();
    let chunks_to_insert: Vec<DocumentChunk> = res
        .chunks
        .iter()
        .map(|c| DocumentChunk {
            id: format!("{}_chunk_{}", asset.id, c.chunk_index),
            asset_id: asset.id.clone(),
            chunk_index: c.chunk_index,
            content: c.content.clone(),
            token_count: c.token_count,
            page_number: c.page_number,
            created_at: now,
        })
        .collect();

    state.repo.insert_document_chunks(&chunks_to_insert).await?;

    // Guardar los nodos y aristas en SQLite para el grafo
    let nodes_to_insert: Vec<GraphNode> = res
        .graph_nodes
        .iter()
        .map(|n| GraphNode {
            id: n.id.clone(),
            project_id: asset.project_id.clone(),
            workspace_id: asset.workspace_id.clone(),
            name: n.name.clone(),
            kind: n.kind.clone(),
            description: n.description.clone(),
            evidence: n.evidence.clone(),
            x: n.x,
            y: n.y,
            weight: n.weight,
            created_at: now,
            source_event: "upload".into(),
            event_id: asset.connector_id.clone().unwrap_or_default(),
            icon: "".into(),
            is_ephemeral: false,
            source_asset_id: Some(asset.id.clone()),
            source_chat_id: None,
            origin_kind: "document".into(),
            pinned: false,
            deleted_at: None,
        })
        .collect();

    state.repo.insert_graph_nodes(&nodes_to_insert).await?;

    let edges_to_insert: Vec<GraphEdge> = res
        .graph_edges
        .iter()
        .map(|e| GraphEdge {
            id: e.id.clone(),
            project_id: asset.project_id.clone(),
            source: e.source.clone(),
            target: e.target.clone(),
            relation: e.relation.clone(),
            strength: e.strength,
            created_at: now,
        })
        .collect();

    state.repo.insert_graph_edges(&edges_to_insert).await?;

    // Actualizar el estado del asset a Ready y guardar contadores
    state
        .repo
        .update_asset_indexing_result(
            &asset.id,
            AssetStatus::Ready,
            chunks_to_insert.len() as i64,
            res.embeddings_count,
            nodes_to_insert.len() as i64,
            now,
        )
        .await?;

    // Registrar evento de éxito en sync_events
    let trace_id = Uuid::new_v4().to_string();
    let detail_msg = format!(
        "Indexación completa: {} chunks, {} embeddings y {} nodos creados.",
        chunks_to_insert.len(),
        res.embeddings_count,
        nodes_to_insert.len()
    );

    insert_sync_event(
        &state.db,
        &asset.project_id,
        asset.workspace_id.as_deref(),
        asset.connector_id.as_deref(),
        Some(&asset.id),
        SyncEventType::Indexed,
        Some(detail_msg),
        Some(&trace_id),
    )
    .await;

    // Emitir evento graph:updated
    if let Some(ref handle) = state.app_handle {
        let payload = GraphUpdatePayload {
            source_event: "upload".into(),
            event_id: asset.id.clone(),
            nodes: nodes_to_insert.clone(),
            edges: edges_to_insert.clone(),
            timestamp: now,
        };
        emit_graph_update(handle, payload);
    }

    Ok(chunks_to_insert.len() as i64)
}

/// Obtiene todos los chunks de un documento ordenados.
#[tauri::command]
pub async fn list_document_chunks(
    document_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<DocumentChunk>, String> {
    if document_id.trim().is_empty() {
        return Err("document_id requerido".into());
    }
    state.repo.list_document_chunks(&document_id).await
}
