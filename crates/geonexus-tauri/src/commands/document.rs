use tauri::State;
use uuid::Uuid;
use std::time::{SystemTime, UNIX_EPOCH};
use crate::AppState;
use geonexus_core::{AssetStatus, DocumentChunk, GraphNode, GraphEdge, SyncEventType};

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
    let project_root = std::env::current_dir().unwrap_or_default();
    let root_path = if project_root.ends_with("geonexus-tauri") {
        project_root.parent().unwrap_or(&project_root).to_path_buf()
    } else {
        project_root.clone()
    };

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

    let output = cmd
        .output()
        .map_err(|e| format!("Fallo al ejecutar el sidecar de Python: {e}"))?;

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
    let res: PythonIndexResult = serde_json::from_str(&stdout_str)
        .map_err(|e| format!("Error deserializando el resultado del indexador: {e}. Output: {stdout_str}"))?;

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

    // 2. Re-sembrar los datos base/semilla del grafo de conocimiento
    let now = unix_now();
    let seed_nodes = vec![
        GraphNode {
            id: "pot-142".into(),
            project_id: project_id.clone(),
            workspace_id: Some("workspace-main".into()),
            name: "Art. 142".into(),
            kind: "norma".into(),
            description: "Restriccion de altura para zonas cercanas a corredores hidricos.".into(),
            evidence: "POT Barranquilla 2024 / pagina 318".into(),
            x: 42.0,
            y: 28.0,
            weight: 3,
            created_at: now,
        },
        GraphNode {
            id: "zona-norte".into(),
            project_id: project_id.clone(),
            workspace_id: Some("workspace-main".into()),
            name: "Zona norte".into(),
            kind: "zona".into(),
            description: "Sector industrial con restricciones urbanisticas activas.".into(),
            evidence: "Capa zonificacion_norte.geojson".into(),
            x: 58.0,
            y: 42.0,
            weight: 4,
            created_at: now,
        },
        GraphNode {
            id: "retiro-hidrico".into(),
            project_id: project_id.clone(),
            workspace_id: Some("workspace-main".into()),
            name: "Retiro hidrico".into(),
            kind: "concepto".into(),
            description: "Franja de proteccion obligatoria alrededor de canales y arroyos.".into(),
            evidence: "Memoria tecnica ambiental / seccion 4.2".into(),
            x: 36.0,
            y: 58.0,
            weight: 2,
            created_at: now,
        },
        GraphNode {
            id: "dxf-catastro".into(),
            project_id: project_id.clone(),
            workspace_id: Some("workspace-main".into()),
            name: "DXF Catastro".into(),
            kind: "documento".into(),
            description: "Plano importado con predios, linderos y vias secundarias.".into(),
            evidence: "catastro_sector_norte.dxf".into(),
            x: 70.0,
            y: 64.0,
            weight: 2,
            created_at: now,
        },
        GraphNode {
            id: "uso-industrial".into(),
            project_id: project_id.clone(),
            workspace_id: Some("workspace-main".into()),
            name: "Uso industrial II".into(),
            kind: "norma".into(),
            description: "Uso permitido bajo impacto con control de ruido y emisiones.".into(),
            evidence: "POT Barranquilla 2024 / articulo 88".into(),
            x: 24.0,
            y: 35.0,
            weight: 2,
            created_at: now,
        },
        GraphNode {
            id: "capa-canales".into(),
            project_id: project_id.clone(),
            workspace_id: Some("workspace-main".into()),
            name: "Canales".into(),
            kind: "capa".into(),
            description: "Capa GIS de drenaje urbano usada para cruces espaciales.".into(),
            evidence: "canales_principales.geojson".into(),
            x: 50.0,
            y: 76.0,
            weight: 3,
            created_at: now,
        },
    ];

    state.repo.insert_graph_nodes(&seed_nodes).await?;

    let seed_edges = vec![
        GraphEdge {
            id: "e1".into(),
            project_id: project_id.clone(),
            source: "pot-142".into(),
            target: "zona-norte".into(),
            relation: "limita".into(),
            strength: 92,
            created_at: now,
        },
        GraphEdge {
            id: "e2".into(),
            project_id: project_id.clone(),
            source: "pot-142".into(),
            target: "retiro-hidrico".into(),
            relation: "define".into(),
            strength: 88,
            created_at: now,
        },
        GraphEdge {
            id: "e3".into(),
            project_id: project_id.clone(),
            source: "retiro-hidrico".into(),
            target: "capa-canales".into(),
            relation: "se calcula con".into(),
            strength: 84,
            created_at: now,
        },
        GraphEdge {
            id: "e4".into(),
            project_id: project_id.clone(),
            source: "zona-norte".into(),
            target: "dxf-catastro".into(),
            relation: "intersecta".into(),
            strength: 79,
            created_at: now,
        },
        GraphEdge {
            id: "e5".into(),
            project_id: project_id.clone(),
            source: "uso-industrial".into(),
            target: "zona-norte".into(),
            relation: "aplica en".into(),
            strength: 86,
            created_at: now,
        },
        GraphEdge {
            id: "e6".into(),
            project_id: project_id.clone(),
            source: "dxf-catastro".into(),
            target: "capa-canales".into(),
            relation: "cruza con".into(),
            strength: 71,
            created_at: now,
        },
    ];

    state.repo.insert_graph_edges(&seed_edges).await?;

    // 3. Re-escanear documentos indexados para extraer y añadir sus nodos dinámicos
    let assets = state.repo.list_data_assets(&project_id).await?;
    for asset in assets {
        if asset.status == AssetStatus::Ready && asset.chunks > 0 {
            let chunks = state.repo.list_document_chunks(&asset.id).await?;
            if !chunks.is_empty() {
                // Usamos la misma función de análisis de grafos en Python pero la simulamos en Rust
                // para evitar invocar el proceso múltiples veces en rebuild.
                let doc_node_id = format!("doc-{}", asset.id);
                let doc_node = GraphNode {
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
                };
                let _ = state.repo.insert_graph_nodes(&[doc_node]).await;

                // Crear relación entre el documento y el Art. 142 de forma predeterminada
                let edge = GraphEdge {
                    id: format!("edge-doc-{}-pot-142", asset.id),
                    project_id: project_id.clone(),
                    source: doc_node_id,
                    target: "pot-142".to_string(),
                    relation: "aporta contexto a".into(),
                    strength: 85,
                    created_at: now,
                };
                let _ = state.repo.insert_graph_edges(&[edge]).await;
            }
        }
    }

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
