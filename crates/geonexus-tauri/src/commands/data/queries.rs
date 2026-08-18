use std::time::{SystemTime, UNIX_EPOCH};
use tauri::State;
use crate::AppState;
use crate::commands::data::{MentionableSource, MentionableSources};

fn unix_now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

#[tauri::command]
pub async fn get_mentionable_sources(
    project_id: String,
    query: Option<String>,
    state: State<'_, AppState>,
) -> Result<MentionableSources, String> {
    if project_id.trim().is_empty() {
        return Err("project_id requerido".into());
    }
    let pool = &state.db;
    let q = query.unwrap_or_default();

    // Connectors
    #[derive(sqlx::FromRow)]
    struct ConnectorRow {
        id: String,
        display_name: String,
        provider: String,
        is_active: i64,
        last_synced: Option<i64>,
    }

    let connector_rows = sqlx::query_as::<_, ConnectorRow>(
        "SELECT id, display_name, provider, is_active, last_synced FROM connector_configs WHERE project_id = ? ORDER BY updated_at DESC LIMIT 10"
    )
    .bind(&project_id)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Error fetching connectors: {e}"))?;

    // Check for recent errors in sync_events per connector
    let mut error_connectors: Vec<String> = Vec::new();
    if !connector_rows.is_empty() {
        let ids: Vec<&str> = connector_rows.iter().map(|r| r.id.as_str()).collect();
        for cid in &ids {
            let err_count: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM sync_events WHERE connector_id = ? AND event_type = 'error' AND created_at > ?"
            )
            .bind(cid)
            .bind(unix_now() - 86400) // last 24h
            .fetch_one(pool)
            .await
            .unwrap_or(0);
            if err_count > 0 {
                error_connectors.push(cid.to_string());
            }
        }
    }

    fn connector_status(row: &ConnectorRow, errors: &[String]) -> &'static str {
        if row.provider == "mcp" { return "mcp"; }
        if row.is_active == 0 { return "disconnected"; }
        if errors.contains(&row.id) { return "error"; }
        if row.last_synced.is_some() { return "connected"; }
        "disconnected"
    }

    fn connector_icon(provider: &str) -> &'static str {
        match provider {
            "onedrive" => "Cloud",
            "local" => "Folder",
            "googledrive" => "Cloud",
            "mcp" => "Cpu",
            _ => "Cloud",
        }
    }

    fn connector_color(provider: &str) -> &'static str {
        match provider {
            "onedrive" => "#0078D4",
            "local" => "#F59E0B",
            "googledrive" => "#34A853",
            "mcp" => "#6366F1",
            _ => "#0078D4",
        }
    }

    fn connector_sublabel(row: &ConnectorRow, status: &str) -> String {
        match status {
            "connected" => {
                if let Some(ts) = row.last_synced {
                    let ago = (unix_now() - ts) / 60;
                    if ago < 60 {
                        format!("sync hace {}m", ago)
                    } else {
                        format!("sync hace {}h", ago / 60)
                    }
                } else {
                    "Conectado".into()
                }
            }
            "error" => "Error en sync".into(),
            "disconnected" => "No conectado".into(),
            "mcp" => "Herramienta MCP".into(),
            _ => "".into(),
        }
    }

    // Count assets per connector for the mini-panel
    let mut asset_count_map: std::collections::HashMap<String, i64> = std::collections::HashMap::new();
    {
        let connector_ids: Vec<&str> = connector_rows.iter().map(|r| r.id.as_str()).collect();
        if !connector_ids.is_empty() {
            #[derive(sqlx::FromRow)]
            struct AssetCountRow {
                connector_id: String,
                cnt: i64,
            }
            if let Ok(counts) = sqlx::query_as::<_, AssetCountRow>(
                "SELECT connector_id, COUNT(*) as cnt FROM assets WHERE project_id = ? AND connector_id IS NOT NULL GROUP BY connector_id"
            )
            .bind(&project_id)
            .fetch_all(pool)
            .await
            {
                for row in counts {
                    asset_count_map.insert(row.connector_id, row.cnt);
                }
            }
        }
    }

    let connectors: Vec<MentionableSource> = connector_rows
        .into_iter()
        .filter(|row| row.is_active != 0)
        .filter(|row| {
            q.is_empty() || row.display_name.to_lowercase().contains(&q.to_lowercase())
        })
        .map(|row| {
            let status = connector_status(&row, &error_connectors);
            let icon = connector_icon(&row.provider);
            let color = connector_color(&row.provider);
            let sublabel = connector_sublabel(&row, status);
            let last_synced = row.last_synced;
            let asset_count = asset_count_map.get(&row.id).copied();
            let provider = Some(row.provider.clone());
            MentionableSource {
                id: row.id,
                kind: "connector".into(),
                label: row.display_name,
                sublabel,
                icon: icon.into(),
                color: color.into(),
                status: status.into(),
                last_synced,
                asset_count,
                provider,
            }
        })
        .collect();

    #[derive(sqlx::FromRow)]
    struct McpServerRow {
        id: String,
        name: String,
        status: String,
        transport: String,
        tools_count: Option<i64>,
    }

    let mcp_servers = sqlx::query_as::<_, McpServerRow>(
        "SELECT id, name, status, transport, tools_count
         FROM mcp_servers
         WHERE disabled = 0
         ORDER BY CASE status WHEN 'online' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END, name ASC
         LIMIT 12"
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Error fetching MCP servers: {e}"))?
    .into_iter()
    .filter(|row| {
        q.is_empty() || row.name.to_lowercase().contains(&q.to_lowercase()) || row.id.to_lowercase().contains(&q.to_lowercase())
    })
    .map(|row| {
        let tools = row.tools_count.unwrap_or(0);
        let state = match row.status.as_str() {
            "online" => "activo",
            "pending" => "pendiente",
            "degraded" => "degradado",
            _ => "offline",
        };
        MentionableSource {
            id: row.id,
            kind: "mcp_server".into(),
            label: row.name,
            sublabel: format!("{} · {} · {} tools", row.transport.to_uppercase(), state, tools),
            icon: "Server".into(),
            color: "#4F46E5".into(),
            status: "mcp".into(),
            last_synced: None,
            asset_count: Some(tools),
            provider: Some("mcp".into()),
        }
    })
    .collect::<Vec<_>>();

    // Assets
    #[derive(sqlx::FromRow)]
    struct AssetRow {
        id: String,
        name: String,
        chunks: i64,
        status: String,
    }

    let assets = sqlx::query_as::<_, AssetRow>(
        "SELECT id, name, COALESCE(chunks, 0) AS chunks, COALESCE(status, 'unknown') AS status FROM assets WHERE project_id = ? ORDER BY updated_at DESC LIMIT 10"
    )
    .bind(&project_id)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Error fetching assets: {e}"))?
    .into_iter()
    .filter(|row| {
        q.is_empty() || row.name.to_lowercase().contains(&q.to_lowercase())
    })
    .map(|row| MentionableSource {
        id: row.id,
        kind: "asset".into(),
        label: row.name,
        sublabel: format!("{} chunks · {}", row.chunks, row.status),
        icon: "FileText".into(),
        color: "#8B5CF6".into(),
        status: "connected".into(),
        last_synced: None,
        asset_count: None,
        provider: None,
    })
    .collect::<Vec<_>>();

    // Graph nodes
    #[derive(sqlx::FromRow)]
    struct NodeRow {
        id: String,
        name: String,
        kind: String,
        weight: i64,
    }

    let graph_nodes = sqlx::query_as::<_, NodeRow>(
        "SELECT id, name, COALESCE(kind, 'concepto') AS kind, COALESCE(weight, 1) AS weight FROM graph_nodes WHERE project_id = ? ORDER BY weight DESC, created_at DESC LIMIT 5"
    )
    .bind(&project_id)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Error fetching graph nodes: {e}"))?
    .into_iter()
    .filter(|row| {
        q.is_empty() || row.name.to_lowercase().contains(&q.to_lowercase())
    })
    .map(|row| MentionableSource {
        id: row.id,
        kind: "graph_node".into(),
        label: row.name,
        sublabel: format!("{} · peso {}", row.kind, row.weight),
        icon: "GitFork".into(),
        color: "#B45309".into(),
        status: "connected".into(),
        last_synced: None,
        asset_count: None,
        provider: None,
    })
    .collect::<Vec<_>>();

    Ok(MentionableSources { connectors, mcp_servers, assets, graph_nodes })
}
