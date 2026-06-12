use tauri::State;
use uuid::Uuid;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use crate::AppState;
use geonexus_core::{AssetStatus, DocumentChunk, GraphNode, GraphEdge, GraphUpdatePayload, SyncEventType};
use crate::commands::graph_events::emit_graph_update;

fn unix_now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

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

    // 1. Obtener la metadata del activo desde la base de datos
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

    // 2. Determinar la ruta del ejecutable de Python y del script sidecar
    // Buscar el directorio raiz del proyecto que contiene `ai/sidecar.py`
    let mut root_path = std::env::current_dir().unwrap_or_default();
    loop {
        if root_path.join("ai").join("sidecar.py").exists() {
            break;
        }
        if !root_path.pop() {
            // no more ancestors — keep current_dir as-is, the .exists() check below will fail
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

    // 3. Invocar al sidecar de Python para indexar el archivo
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
        let err_msg = String::from_utf8_lossy(&output.stderr);
        // Si falla, volvemos a poner estado Error en el asset
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

    let stdout_str = String::from_utf8_lossy(&output.stdout);
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

    // 4. Limpiar chunks antiguos si existieran
    state.repo.delete_document_chunks(&asset.id).await?;

    // 5. Guardar los nuevos chunks en SQLite
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

    // 6. Guardar los nodos y aristas en SQLite para el grafo
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

    // 7. Actualizar el estado del asset a Ready y guardar contadores
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

    // 8. Registrar evento de éxito en sync_events
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

/// Obtiene todos los nodos del grafo para un proyecto.
#[tauri::command]
pub async fn list_graph_nodes(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<GraphNode>, String> {
    if project_id.trim().is_empty() {
        return Err("project_id requerido".into());
    }
    state.repo.list_graph_nodes(&project_id).await
}

/// Obtiene todas las aristas/relaciones del grafo para un proyecto.
#[tauri::command]
pub async fn list_graph_edges(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<GraphEdge>, String> {
    if project_id.trim().is_empty() {
        return Err("project_id requerido".into());
    }
    state.repo.list_graph_edges(&project_id).await
}

/// Vacía y recalcula la red del grafo de conocimiento.
#[tauri::command]
pub async fn rebuild_knowledge_graph(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    if project_id.trim().is_empty() {
        return Err("project_id requerido".into());
    }

    // 1. Limpiar el grafo actual
    state.repo.clear_graph(&project_id).await?;

    // 2. Localizar el sidecar de Python
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
        return Err("No se encontró el script sidecar.py".into());
    }

    // 3. Escanear documentos indexados y re-extraer entidades
    let assets = state.repo.list_data_assets(&project_id).await?;
    let now = unix_now();
    let mut all_nodes: Vec<GraphNode> = vec![];
    let mut all_edges: Vec<GraphEdge> = vec![];

    for asset in assets {
        if asset.status != AssetStatus::Ready || asset.chunks <= 0 {
            continue;
        }
        let chunks = state.repo.list_document_chunks(&asset.id).await?;
        if chunks.is_empty() {
            continue;
        }

        // Nodo documento para este asset
        let doc_node_id = format!("doc-{}", asset.id);
        all_nodes.push(GraphNode {
            id: doc_node_id.clone(),
            project_id: project_id.clone(),
            workspace_id: asset.workspace_id.clone(),
            name: asset.name.clone(),
            kind: "documento".into(),
            description: format!("Documento '{}' indexado en el grafo de conocimiento.", asset.name),
            evidence: format!("Asset ID: {}", asset.id),
            x: round_val(random_f64(10.0, 90.0)),
            y: round_val(random_f64(10.0, 90.0)),
            weight: 2,
            created_at: now,
            source_event: "".into(),
            event_id: "".into(),
            icon: "".into(),
            is_ephemeral: false,
        });

        // Convertir chunks a JSON para el sidecar
        let chunks_json: Vec<serde_json::Value> = chunks
            .iter()
            .map(|c| {
                serde_json::json!({
                    "content": c.content,
                    "page_number": c.page_number,
                })
            })
            .collect();
        let chunks_str = serde_json::to_string(&chunks_json)
            .map_err(|e| format!("Error serializando chunks: {e}"))?;

        let mut cmd = std::process::Command::new(&python_exe);
        cmd.arg(&sidecar_script)
            .arg("--action")
            .arg("extract_graph_entities")
            .arg("--chunks_json")
            .arg(&chunks_str)
            .arg("--project_id")
            .arg(&project_id)
            .arg("--workspace_id")
            .arg(asset.workspace_id.as_deref().unwrap_or("workspace-main"))
            .current_dir(&root_path);

        if let Ok(output) = cmd.output() {
            if output.status.success() {
                let stdout_str = String::from_utf8_lossy(&output.stdout);
                if let Ok(extracted) = serde_json::from_str::<serde_json::Value>(&stdout_str) {
                    if let Some(nodes) = extracted["nodes"].as_array() {
                        for n in nodes {
                            all_nodes.push(GraphNode {
                                id: n["id"].as_str().unwrap_or("").into(),
                                project_id: project_id.clone(),
                                workspace_id: asset.workspace_id.clone(),
                                name: n["name"].as_str().unwrap_or("").into(),
                                kind: n["kind"].as_str().unwrap_or("concepto").into(),
                                description: n["description"].as_str().unwrap_or("").into(),
                                evidence: n["evidence"].as_str().unwrap_or("").into(),
                                x: n["x"].as_f64().unwrap_or(50.0),
                                y: n["y"].as_f64().unwrap_or(50.0),
                                weight: n["weight"].as_i64().unwrap_or(1),
                                created_at: now,
                                source_event: "upload".into(),
                                event_id: asset.id.clone(),
                                icon: "".into(),
                                is_ephemeral: false,
                            });
                        }
                    }
                    if let Some(edges) = extracted["edges"].as_array() {
                        for e in edges {
                            all_edges.push(GraphEdge {
                                id: e["id"].as_str().unwrap_or("").into(),
                                project_id: project_id.clone(),
                                source: e["source"].as_str().unwrap_or("").into(),
                                target: e["target"].as_str().unwrap_or("").into(),
                                relation: e["relation"].as_str().unwrap_or("asociado con").into(),
                                strength: e["strength"].as_i64().unwrap_or(50),
                                created_at: now,
                            });
                        }
                    }
                }
            }
        }
    }

    // 4. Insertar todos los nodos y aristas
    if !all_nodes.is_empty() {
        state.repo.insert_graph_nodes(&all_nodes).await?;
    }
    if !all_edges.is_empty() {
        state.repo.insert_graph_edges(&all_edges).await?;
    }

    // 5. Si no hay nada, sembrar datos por defecto
    state.repo.seed_if_empty().await?;

    Ok(())
}

/// Actualiza la posición de un nodo en el canvas (persistencia al arrastrar).
#[tauri::command]
pub async fn update_node_position(
    node_id: String,
    x: f64,
    y: f64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    if node_id.trim().is_empty() {
        return Err("node_id requerido".into());
    }
    sqlx::query("UPDATE graph_nodes SET x = ?1, y = ?2 WHERE id = ?3")
        .bind(x)
        .bind(y)
        .bind(&node_id)
        .execute(&state.db)
        .await
        .map_err(|e| format!("Error actualizando posición del nodo: {e}"))?;
    Ok(())
}

fn round_val(val: f64) -> f64 {
    (val * 100.0).round() / 100.0
}

fn random_f64(min: f64, max: f64) -> f64 {
    // Generador pseudoaleatorio simple basado en tiempo
    let seed = unix_now() as u32;
    let mut x = seed;
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    let r = x as f64 / u32::MAX as f64;
    min + r * (max - min)
}

/// Helper para insertar eventos en sync_events
async fn insert_sync_event(
    pool: &sqlx::SqlitePool,
    project_id: &str,
    workspace_id: Option<&str>,
    connector_id: Option<&str>,
    asset_id: Option<&str>,
    event_type: SyncEventType,
    detail: Option<String>,
    trace_id: Option<&str>,
) {
    let id = Uuid::new_v4().to_string();
    let now = unix_now();
    let trace_str = trace_id.unwrap_or("");
    let event_type_str = serde_json::to_string(&event_type)
        .unwrap_or_default()
        .trim_matches('"')
        .to_string();

    let _ = sqlx::query(
        "INSERT INTO sync_events (id, project_id, workspace_id, connector_id, asset_id, agent_id, event_type, detail, trace_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(id)
    .bind(project_id)
    .bind(workspace_id)
    .bind(connector_id)
    .bind(asset_id)
    .bind(None::<String>) // agent_id
    .bind(event_type_str)
    .bind(detail)
    .bind(trace_str)
    .bind(now)
    .execute(pool)
    .await;
}
