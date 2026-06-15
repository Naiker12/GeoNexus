use sqlx::SqlitePool;
use uuid::Uuid;
use crate::stdio::StdioDiscoveredTool;
use crate::types::*;

const SERVER_COLUMNS: &str = "id, name, url, status, transport, auth_type, auth_ref, auth_token, \
    command, args_json, env_json, headers_json, disabled, auto_approve_json, timeout_ms, \
    latency_ms, error_count, description, tools_count, protocol_version, last_error, last_ping_at";

pub async fn list_servers(pool: &SqlitePool) -> Result<Vec<McpServer>, sqlx::Error> {
    let query = format!("SELECT {} FROM mcp_servers ORDER BY created_at ASC", SERVER_COLUMNS);
    let rows = sqlx::query_as::<_, McpServerRow>(&query)
        .fetch_all(pool)
        .await?;

    Ok(rows.into_iter().map(McpServer::from).collect())
}

pub async fn register_server(pool: &SqlitePool, payload: RegisterServerPayload) -> Result<McpServer, sqlx::Error> {
    let transport = payload.transport.as_deref().unwrap_or("http");
    let disabled = if payload.disabled.unwrap_or(false) { 1 } else { 0 };
    let args_json = payload.args.as_ref().map(|a| serde_json::to_string(a).unwrap_or_default());
    let env_json = payload.env.as_ref().map(|e| serde_json::to_string(e).unwrap_or_default());
    let headers_json = payload.headers.as_ref().map(|h| serde_json::to_string(h).unwrap_or_default());
    let auto_approve_json = payload.auto_approve.as_ref().map(|a| serde_json::to_string(a).unwrap_or_default());

    sqlx::query(
        "INSERT INTO mcp_servers \
         (id, name, url, status, transport, auth_type, auth_ref, auth_token, \
          command, args_json, env_json, headers_json, disabled, auto_approve_json, timeout_ms) \
         VALUES (?1, ?2, ?3, 'pending', ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14) \
         ON CONFLICT(id) DO UPDATE SET \
           name = excluded.name, url = excluded.url, transport = excluded.transport, \
           auth_type = excluded.auth_type, auth_ref = excluded.auth_ref, auth_token = excluded.auth_token, \
           command = excluded.command, args_json = excluded.args_json, env_json = excluded.env_json, \
           headers_json = excluded.headers_json, disabled = excluded.disabled, \
           auto_approve_json = excluded.auto_approve_json, timeout_ms = excluded.timeout_ms, \
           updated_at = datetime('now')"
    )
    .bind(&payload.id)
    .bind(&payload.name)
    .bind(&payload.url)
    .bind(transport)
    .bind(&payload.auth_type)
    .bind(&payload.auth_ref)
    .bind(&payload.auth_token)
    .bind(&payload.command)
    .bind(&args_json)
    .bind(&env_json)
    .bind(&headers_json)
    .bind(disabled)
    .bind(&auto_approve_json)
    .bind(payload.timeout_ms)
    .execute(pool)
    .await?;

    if let Some(tools) = &payload.tools {
        for tool_name in tools {
            let tool_id = Uuid::new_v4().to_string();
            sqlx::query(
                "INSERT OR IGNORE INTO mcp_tools (id, server_id, name, status)
                 VALUES (?1, ?2, ?3, 'planned')"
            )
            .bind(&tool_id)
            .bind(&payload.id)
            .bind(tool_name)
            .execute(pool)
            .await?;
        }
    }

    // Auto-descubrimiento solo para HTTP
    if transport == "http" && !payload.url.is_empty() {
        if let Err(e) = auto_discover_tools(pool, &payload.url, &payload.id, payload.auth_token.as_deref()).await {
            tracing::warn!("auto_discover_tools falló para {}: {e}", payload.id);
        }
    }

    get_server(pool, &payload.id).await
}

pub async fn delete_server(pool: &SqlitePool, server_id: &str) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM mcp_servers WHERE id = ?1")
        .bind(server_id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn get_server(pool: &SqlitePool, id: &str) -> Result<McpServer, sqlx::Error> {
    let query = format!("SELECT {} FROM mcp_servers WHERE id = ?1", SERVER_COLUMNS);
    let row = sqlx::query_as::<_, McpServerRow>(&query)
        .bind(id)
        .fetch_one(pool)
        .await?;

    Ok(McpServer::from(row))
}

pub async fn update_server_status(
    pool: &SqlitePool,
    server_id: &str,
    online: bool,
    latency_ms: Option<u64>,
) -> Result<(), sqlx::Error> {
    let status = if online { "online" } else { "offline" };
    sqlx::query(
        "UPDATE mcp_servers SET status = ?1, latency_ms = ?2, last_ping_at = datetime('now')
         WHERE id = ?3"
    )
    .bind(status)
    .bind(latency_ms.map(|l| l as i64))
    .bind(server_id)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn update_server_ping_result(
    pool: &SqlitePool,
    server_id: &str,
    online: bool,
    latency_ms: Option<u64>,
    tools_count: Option<i32>,
    protocol_version: Option<&str>,
    last_error: Option<&str>,
) -> Result<(), sqlx::Error> {
    let status = if online { "online" } else { "offline" };
    sqlx::query(
        "UPDATE mcp_servers SET status = ?1, latency_ms = ?2, tools_count = ?3, \
         protocol_version = ?4, last_error = ?5, last_ping_at = datetime('now')
         WHERE id = ?6"
    )
    .bind(status)
    .bind(latency_ms.map(|l| l as i64))
    .bind(tools_count)
    .bind(protocol_version)
    .bind(last_error)
    .bind(server_id)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn list_tools(pool: &SqlitePool, server_id: &str) -> Result<Vec<McpTool>, sqlx::Error> {
    let rows = sqlx::query_as::<_, McpToolRow>(
        "SELECT id, server_id, name, description, args_schema, return_type, status, category, args, result
         FROM mcp_tools WHERE server_id = ?1 ORDER BY name ASC"
    )
    .bind(server_id)
    .fetch_all(pool)
    .await?;

    Ok(rows.into_iter().map(McpTool::from).collect())
}

pub async fn upsert_tool(pool: &SqlitePool, server_id: &str, name: &str, category: &str,
    description: &str, args: &str, result: &str) -> Result<(), sqlx::Error> {
    let existing: Option<(String,)> = sqlx::query_as(
        "SELECT id FROM mcp_tools WHERE server_id = ?1 AND name = ?2"
    )
    .bind(server_id)
    .bind(name)
    .fetch_optional(pool)
    .await?;

    let tool_id = existing.map(|r| r.0).unwrap_or_else(|| Uuid::new_v4().to_string());

    sqlx::query(
        "INSERT INTO mcp_tools (id, server_id, name, category, description, args, result, status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'ready')
         ON CONFLICT(id) DO UPDATE SET
           category = excluded.category,
           description = excluded.description,
           args = excluded.args,
           result = excluded.result,
           status = 'ready',
           updated_at = datetime('now')"
    )
    .bind(&tool_id)
    .bind(server_id)
    .bind(name)
    .bind(category)
    .bind(description)
    .bind(args)
    .bind(result)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn auto_discover_tools(
    pool: &SqlitePool,
    server_url: &str,
    server_id: &str,
    auth_token: Option<&str>,
) -> Result<usize, String> {
    if server_url.is_empty() {
        return Err("URL vacía — no se puede descubrir tools para servidores stdio".into());
    }

    let endpoint = server_url.trim_end_matches('/');
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Error creando cliente HTTP: {e}"))?;

    let init_payload = serde_json::json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2025-06-18",
            "capabilities": { "tools": {} },
            "clientInfo": {
                "name": "geonexus-mcp-router",
                "version": "1.0.0"
            }
        }
    });

    let mut req = client.post(endpoint).json(&init_payload)
        .header("Content-Type", "application/json")
        .header("Accept", "application/json, text/event-stream");
    if let Some(token) = auth_token {
        req = req.header("Authorization", format!("Bearer {}", token));
    }

    let init_resp = req.send().await
        .map_err(|e| format!("Error conectando al servidor MCP: {e}"))?;

    if !init_resp.status().is_success() {
        return Err(format!("initialize falló: HTTP {}", init_resp.status()));
    }

    let init_json: serde_json::Value = init_resp.json().await
        .map_err(|e| format!("Error parsing initialize response: {e}"))?;

    if let Some(err) = init_json.get("error") {
        return Err(
            err.get("message")
                .and_then(|m| m.as_str())
                .unwrap_or("Error JSON-RPC en initialize")
                .to_string()
        );
    }

    let notif_payload = serde_json::json!({
        "jsonrpc": "2.0",
        "method": "notifications/initialized"
    });

    let _ = client.post(endpoint).json(&notif_payload)
        .header("Content-Type", "application/json")
        .send()
        .await;

    let tools_payload = serde_json::json!({
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/list"
    });

    let mut req = client.post(endpoint).json(&tools_payload)
        .header("Content-Type", "application/json")
        .header("Accept", "application/json, text/event-stream");
    if let Some(token) = auth_token {
        req = req.header("Authorization", format!("Bearer {}", token));
    }

    let response = req.send().await
        .map_err(|e| format!("Error en tools/list: {e}"))?;

    if !response.status().is_success() {
        return Err(format!("HTTP {} en tools/list", response.status()));
    }

    let json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Error parsing tools/list response: {e}"))?;

    if let Some(err) = json.get("error") {
        return Err(
            err.get("message")
                .and_then(|m| m.as_str())
                .unwrap_or("Error JSON-RPC en tools/list")
                .to_string()
        );
    }

    let tools = json
        .get("result")
        .and_then(|r| r.get("tools"))
        .and_then(|t| t.as_array())
        .ok_or_else(|| "Respuesta tools/list inválida: falta result.tools".to_string())?;

    for tool in tools {
        let name = tool.get("name").and_then(|n| n.as_str()).unwrap_or("unknown");
        let description = tool.get("description").and_then(|d| d.as_str()).unwrap_or("");
        let input_schema = tool.get("inputSchema");
        let args_json = input_schema
            .map(|s| serde_json::to_string(s).unwrap_or_default())
            .unwrap_or_default();
        let category = infer_tool_category(name, description);
        let _ = upsert_tool(pool, server_id, name, &category, description, &args_json, "").await;
    }

    let _ = sqlx::query(
        "UPDATE mcp_tools SET last_discovered_at = datetime('now')
         WHERE server_id = ?1"
    )
    .bind(server_id)
    .execute(pool)
    .await;

    Ok(tools.len())
}

pub async fn sync_tools_from_ping(
    pool: &SqlitePool,
    server_id: &str,
    tools: &[serde_json::Value],
) -> Result<usize, sqlx::Error> {
    sqlx::query("DELETE FROM mcp_tools WHERE server_id = ?1")
        .bind(server_id)
        .execute(pool)
        .await?;

    let mut count = 0usize;
    for tool in tools {
        let name = tool.get("name").and_then(|n| n.as_str()).unwrap_or("unknown");
        let description = tool.get("description").and_then(|d| d.as_str()).unwrap_or("");
        let input_schema = tool.get("inputSchema");
        let args_json = input_schema
            .map(|s| serde_json::to_string(s).unwrap_or_default())
            .unwrap_or_default();
        let category = infer_tool_category(name, description);

        let tool_id = format!("{}-{}", server_id, name);
        sqlx::query(
            "INSERT INTO mcp_tools (id, server_id, name, description, args_schema, status, category, last_discovered_at)
             VALUES (?1, ?2, ?3, ?4, ?5, 'ready', ?6, datetime('now'))
             ON CONFLICT(id) DO UPDATE SET
               description = excluded.description,
               args_schema = excluded.args_schema,
               status = 'ready',
               category = excluded.category,
               last_discovered_at = datetime('now')"
        )
        .bind(&tool_id)
        .bind(server_id)
        .bind(name)
        .bind(description)
        .bind(&args_json)
        .bind(&category)
        .execute(pool)
        .await?;

        count += 1;
    }

    Ok(count)
}

pub fn infer_tool_category(name: &str, description: &str) -> String {
    let lower = format!("{} {}", name, description).to_lowercase();
    if lower.contains("gis") || lower.contains("geo") || lower.contains("map")
        || lower.contains("spatial") || lower.contains("coordinate")
    {
        "gis".into()
    } else if lower.contains("search") || lower.contains("query") || lower.contains("find")
        || lower.contains("lookup")
    {
        "search".into()
    } else if lower.contains("data") || lower.contains("file") || lower.contains("read")
        || lower.contains("write") || lower.contains("storage")
    {
        "data".into()
    } else if lower.contains("ai") || lower.contains("llm") || lower.contains("model")
        || lower.contains("generate") || lower.contains("analyze")
    {
        "ai".into()
    } else {
        "general".into()
    }
}

pub async fn list_allowlist(pool: &SqlitePool, server_id: &str) -> Result<Vec<AllowlistRule>, sqlx::Error> {
    let rows = sqlx::query_as::<_, AllowlistRuleRow>(
        "SELECT id, server_id, tool_name, allowed, rate_limit
         FROM mcp_allowlist WHERE server_id = ?1 ORDER BY tool_name ASC"
    )
    .bind(server_id)
    .fetch_all(pool)
    .await?;

    Ok(rows.into_iter().map(AllowlistRule::from).collect())
}

pub async fn upsert_allowlist_rule(
    pool: &SqlitePool,
    payload: UpsertAllowlistPayload,
) -> Result<AllowlistRule, sqlx::Error> {
    let id = Uuid::new_v4().to_string();
    let tool_name = payload.tool_name.unwrap_or_else(|| "*".to_string());

    sqlx::query(
        "INSERT INTO mcp_allowlist (id, server_id, tool_name, allowed, rate_limit)
         VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(id) DO UPDATE SET
           allowed = excluded.allowed,
           rate_limit = excluded.rate_limit"
    )
    .bind(&id)
    .bind(&payload.server_id)
    .bind(&tool_name)
    .bind(payload.allowed as i32)
    .bind(payload.rate_limit)
    .execute(pool)
    .await?;

    let row = sqlx::query_as::<_, AllowlistRuleRow>(
        "SELECT id, server_id, tool_name, allowed, rate_limit
         FROM mcp_allowlist WHERE id = ?1"
    )
    .bind(&id)
    .fetch_one(pool)
    .await?;

    Ok(AllowlistRule::from(row))
}

pub async fn delete_allowlist_rule(pool: &SqlitePool, rule_id: &str) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM mcp_allowlist WHERE id = ?1")
        .bind(rule_id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn check_allowlist(pool: &SqlitePool, server_id: &str, tool_name: &str) -> Result<bool, sqlx::Error> {
    let row: Option<(i32,)> = sqlx::query_as(
        "SELECT allowed FROM mcp_allowlist
         WHERE server_id = ?1 AND (tool_name = ?2 OR tool_name = '*')
         ORDER BY CASE WHEN tool_name = '*' THEN 1 ELSE 0 END
         LIMIT 1"
    )
    .bind(server_id)
    .bind(tool_name)
    .fetch_optional(pool)
    .await?;

    Ok(row.map(|r| r.0 != 0).unwrap_or(true))
}

pub async fn record_server_metric(
    pool: &SqlitePool,
    server_id: &str,
    status: &str,
    latency_ms: Option<u64>,
    error_count: i32,
) -> Result<(), sqlx::Error> {
    let id = Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO mcp_server_metrics (id, server_id, status, latency_ms, error_count, tool_calls_ok, tool_calls_error, sampled_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 0, 0, datetime('now'))"
    )
    .bind(&id)
    .bind(server_id)
    .bind(status)
    .bind(latency_ms.map(|l| l as i64))
    .bind(error_count)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn audit_tool_call(
    pool: &SqlitePool,
    server_id: &str,
    tool_name: &str,
    args_json: Option<&str>,
    result_json: Option<&str>,
    result_status: &str,
    duration_ms: i64,
    trace_id: &str,
    agent_name: Option<&str>,
) -> Result<(), sqlx::Error> {
    let id = Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO mcp_tool_calls
         (id, server_id, tool_name, args_json, result_json, result_status, duration_ms, trace_id, agent_name)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)"
    )
    .bind(&id)
    .bind(server_id)
    .bind(tool_name)
    .bind(args_json)
    .bind(result_json)
    .bind(result_status)
    .bind(duration_ms)
    .bind(trace_id)
    .bind(agent_name)
    .execute(pool)
    .await?;
    Ok(())
}

/// Descubre tools desde una URL HTTP sin persistir en DB (preview).
pub async fn preview_http_tools(
    server_url: &str,
    auth_token: Option<&str>,
) -> Result<Vec<StdioDiscoveredTool>, String> {
    let endpoint = server_url.trim_end_matches('/');
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Error creando cliente HTTP: {e}"))?;

    let init_payload = serde_json::json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2025-06-18",
            "capabilities": { "tools": {} },
            "clientInfo": {
                "name": "geonexus-mcp-router",
                "version": "1.0.0"
            }
        }
    });

    let mut req = client.post(endpoint).json(&init_payload)
        .header("Content-Type", "application/json")
        .header("Accept", "application/json, text/event-stream");
    if let Some(token) = auth_token {
        req = req.header("Authorization", format!("Bearer {}", token));
    }

    let init_resp = req.send().await
        .map_err(|e| format!("Error conectando al servidor MCP: {e}"))?;

    if !init_resp.status().is_success() {
        return Err(format!("initialize falló: HTTP {}", init_resp.status()));
    }

    let init_json: serde_json::Value = init_resp.json().await
        .map_err(|e| format!("Error parsing initialize response: {e}"))?;

    if let Some(err) = init_json.get("error") {
        return Err(
            err.get("message")
                .and_then(|m| m.as_str())
                .unwrap_or("Error JSON-RPC en initialize")
                .to_string()
        );
    }

    let notif_payload = serde_json::json!({
        "jsonrpc": "2.0",
        "method": "notifications/initialized"
    });

    let _ = client.post(endpoint).json(&notif_payload)
        .header("Content-Type", "application/json")
        .send()
        .await;

    let tools_payload = serde_json::json!({
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/list"
    });

    let mut req = client.post(endpoint).json(&tools_payload)
        .header("Content-Type", "application/json")
        .header("Accept", "application/json, text/event-stream");
    if let Some(token) = auth_token {
        req = req.header("Authorization", format!("Bearer {}", token));
    }

    let response = req.send().await
        .map_err(|e| format!("Error en tools/list: {e}"))?;

    if !response.status().is_success() {
        return Err(format!("HTTP {} en tools/list", response.status()));
    }

    let json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Error parsing tools/list response: {e}"))?;

    if let Some(err) = json.get("error") {
        return Err(
            err.get("message")
                .and_then(|m| m.as_str())
                .unwrap_or("Error JSON-RPC en tools/list")
                .to_string()
        );
    }

    let tools = json
        .get("result")
        .and_then(|r| r.get("tools"))
        .and_then(|t| t.as_array())
        .ok_or_else(|| "Respuesta tools/list inválida: falta result.tools".to_string())?;

    let result = tools.iter().map(|tool| {
        StdioDiscoveredTool {
            name: tool.get("name").and_then(|n| n.as_str()).unwrap_or("unknown").to_string(),
            description: tool.get("description").and_then(|d| d.as_str()).unwrap_or("").to_string(),
            input_schema: tool.get("inputSchema").cloned(),
        }
    }).collect();

    Ok(result)
}
