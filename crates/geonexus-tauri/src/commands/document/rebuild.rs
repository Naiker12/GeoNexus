use tauri::State;
use crate::AppState;
use geonexus_core::{AssetStatus, GraphNode, GraphEdge};
use crate::commands::document::helpers::unix_now;

/// Vacía y recalcula la red del grafo de conocimiento.
#[tauri::command]
pub async fn rebuild_knowledge_graph(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    if project_id.trim().is_empty() {
        return Err("project_id requerido".into());
    }

    // Limpiar el grafo actual
    state.repo.clear_graph(&project_id).await?;

    // Localizar el sidecar de Python
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

    // Escanear documentos indexados y re-extraer entidades
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
            source_asset_id: Some(asset.id.clone()),
            source_chat_id: None,
            origin_kind: "document".into(),
            pinned: false,
            deleted_at: None,
            use_count: 0,
            last_used_at: None,
            memory_score: 1.0,
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

        let chunks_file = std::env::temp_dir().join(format!("geonexus_chunks_{}.json", asset.id));
        let _ = std::fs::write(&chunks_file, &chunks_str);

        let mut cmd = std::process::Command::new(&python_exe);
        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }
        cmd.arg(&sidecar_script)
            .arg("--action")
            .arg("extract_graph_entities")
            .arg("--chunks_file")
            .arg(chunks_file.to_string_lossy().as_ref())
            .arg("--project_id")
            .arg(&project_id)
            .arg("--workspace_id")
            .arg(asset.workspace_id.as_deref().unwrap_or("workspace-main"))
            .current_dir(&root_path);

        let output = cmd.output();
        let _ = std::fs::remove_file(&chunks_file);

        if let Ok(output) = output {
            if output.status.success() {
                let stdout_str = String::from_utf8(output.stdout)
                    .map_err(|e| format!("stdout del indexador no es UTF-8 válido: {e}"))?;
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
                                source_asset_id: Some(asset.id.clone()),
                                source_chat_id: None,
                                origin_kind: "document".into(),
                                pinned: false,
                                deleted_at: None,
                                use_count: 0,
                                last_used_at: None,
                                memory_score: 1.0,
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

    // Insertar todos los nodos y aristas
    if !all_nodes.is_empty() {
        state.repo.insert_graph_nodes(&all_nodes).await?;
    }
    if !all_edges.is_empty() {
        state.repo.insert_graph_edges(&all_edges).await?;
    }

    // Si no hay nada, sembrar datos por defecto
    state.repo.seed_if_empty().await?;

    Ok(())
}

fn round_val(val: f64) -> f64 {
    (val * 100.0).round() / 100.0
}

fn random_f64(min: f64, max: f64) -> f64 {
    let seed = unix_now() as u32;
    let mut x = seed;
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    let r = x as f64 / u32::MAX as f64;
    min + r * (max - min)
}
