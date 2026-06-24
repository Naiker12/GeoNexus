use sqlx::SqlitePool;
use uuid::Uuid;
use crate::stdio::StdioDiscoveredTool;
use crate::types::*;
use crate::handshake;

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

/// Tools MCP listas para el LLM: servidores activos + tools Ready + allowlist permitida.
pub async fn list_callable_mcp_tools(pool: &SqlitePool) -> Result<Vec<(McpServer, McpTool)>, sqlx::Error> {
    let servers = list_servers(pool).await?;
    let mut out = Vec::new();

    for server in servers {
        if server.disabled {
            continue;
        }
        let tools = list_tools(pool, &server.id).await?;
        for tool in tools {
            if tool.status != ToolStatus::Ready {
                continue;
            }
            let allowlist = check_allowlist(pool, &server.id, &tool.name).await?;
            if let Some(ref rule) = allowlist {
                if !rule.allowed {
                    continue;
                }
            }
            out.push((server.clone(), tool));
        }
    }

    Ok(out)
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
        "INSERT INTO mcp_tools (id, server_id, name, category, description, args_schema, args, result, status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6, ?7, 'ready')
         ON CONFLICT(id) DO UPDATE SET
           category = excluded.category,
           description = excluded.description,
           args_schema = excluded.args_schema,
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
        return Err("URL vacia — no se puede descubrir tools para servidores stdio".into());
    }

    let endpoint = handshake::build_base_url(server_url);
    let client = handshake::build_client(10)
        .map_err(|e| format!("Error creando cliente HTTP: {e}"))?;

    handshake::do_handshake(&client, &endpoint, auth_token).await?;
    let tools = handshake::fetch_tools_list(&client, &endpoint, auth_token, 2).await?;

    for tool in &tools {
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
        "SELECT id, server_id, tool_name, allowed, rate_limit, last_called_at
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
        "SELECT id, server_id, tool_name, allowed, rate_limit, last_called_at
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

pub async fn check_allowlist(pool: &SqlitePool, server_id: &str, tool_name: &str) -> Result<Option<AllowlistRule>, sqlx::Error> {
    let row: Option<AllowlistRuleRow> = sqlx::query_as(
        "SELECT id, server_id, tool_name, allowed, rate_limit, last_called_at
         FROM mcp_allowlist
         WHERE server_id = ?1 AND (tool_name = ?2 OR tool_name = '*')
         ORDER BY CASE WHEN tool_name = '*' THEN 1 ELSE 0 END
         LIMIT 1"
    )
    .bind(server_id)
    .bind(tool_name)
    .fetch_optional(pool)
    .await?;

    Ok(row.map(|r| {
        let rule: AllowlistRule = r.into();
        rule
    }))
}

pub async fn update_last_called_at(pool: &SqlitePool, server_id: &str, tool_name: &str) -> Result<(), sqlx::Error> {
    sqlx::query(
        "UPDATE mcp_allowlist SET last_called_at = datetime('now')
         WHERE server_id = ?1 AND tool_name = ?2"
    )
    .bind(server_id)
    .bind(tool_name)
    .execute(pool)
    .await?;
    Ok(())
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

// ── Curated MCP Catalog ─────────────────────────────────────────

/// Returns the built-in catalog of curated/approved MCP servers.
/// Users can browse and install these with a single click.
pub fn list_curated_servers() -> Vec<CuratedMcpEntry> {
    vec![
        CuratedMcpEntry {
            id: "curated-filesystem".into(),
            name: "Filesystem".into(),
            description: "Safe file operations with path sandboxing — read, write, search, analyze project files.".into(),
            category: "data".into(),
            transport: "stdio".into(),
            url: None,
            command: Some("npx".into()),
            args: Some(vec![
                "-y".into(),
                "@modelcontextprotocol/server-filesystem".into(),
            ]),
            env: None,
            auto_approve: Some(vec!["read_file".into(), "list_files".into(), "search_files".into()]),
            source_url: Some("https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem".into()),
            tags: vec!["file".into(), "fs".into(), "read".into(), "write".into(), "search".into()],
        },
        CuratedMcpEntry {
            id: "curated-github".into(),
            name: "GitHub".into(),
            description: "GitHub API integration — manage repos, issues, PRs, reviews, and search code.".into(),
            category: "tool".into(),
            transport: "stdio".into(),
            url: None,
            command: Some("npx".into()),
            args: Some(vec![
                "-y".into(),
                "@modelcontextprotocol/server-github".into(),
            ]),
            env: None,
            auto_approve: None,
            source_url: Some("https://github.com/modelcontextprotocol/servers/tree/main/src/github".into()),
            tags: vec!["github".into(), "git".into(), "pr".into(), "issues".into()],
        },
        CuratedMcpEntry {
            id: "curated-postgres".into(),
            name: "PostgreSQL".into(),
            description: "Read-only PostgreSQL database access — schema introspection, query execution, and analysis.".into(),
            category: "data".into(),
            transport: "stdio".into(),
            url: None,
            command: Some("npx".into()),
            args: Some(vec![
                "-y".into(),
                "@modelcontextprotocol/server-postgres".into(),
            ]),
            env: None,
            auto_approve: None,
            source_url: Some("https://github.com/modelcontextprotocol/servers/tree/main/src/postgres".into()),
            tags: vec!["database".into(), "sql".into(), "postgres".into(), "query".into()],
        },
        CuratedMcpEntry {
            id: "curated-web-search".into(),
            name: "Web Search".into(),
            description: "Web search and content extraction — search the web and fetch page content.".into(),
            category: "search".into(),
            transport: "stdio".into(),
            url: None,
            command: Some("npx".into()),
            args: Some(vec![
                "-y".into(),
                "@anthropic-ai/mcp-server-web-search".into(),
            ]),
            env: None,
            auto_approve: Some(vec!["web_search".into(), "fetch_page".into()]),
            source_url: Some("https://github.com/anthropics/anthropic-quickstarts/tree/main/mcp-server-web-search".into()),
            tags: vec!["web".into(), "search".into(), "fetch".into()],
        },
        CuratedMcpEntry {
            id: "curated-memory".into(),
            name: "Memory (knowledge graph)".into(),
            description: "Persistent memory using a local knowledge graph — store and recall facts across sessions.".into(),
            category: "ai".into(),
            transport: "stdio".into(),
            url: None,
            command: Some("npx".into()),
            args: Some(vec![
                "-y".into(),
                "@modelcontextprotocol/server-memory".into(),
            ]),
            env: None,
            auto_approve: Some(vec![
                "add_fact".into(), "search_facts".into(), "list_facts".into(),
                "add_relation".into(), "search_relations".into(),
            ]),
            source_url: Some("https://github.com/modelcontextprotocol/servers/tree/main/src/memory".into()),
            tags: vec!["memory".into(), "knowledge".into(), "graph".into(), "facts".into()],
        },
        CuratedMcpEntry {
            id: "curated-puppeteer".into(),
            name: "Puppeteer (browser automation)".into(),
            description: "Headless browser automation — navigate, screenshot, extract data from web pages.".into(),
            category: "tool".into(),
            transport: "stdio".into(),
            url: None,
            command: Some("npx".into()),
            args: Some(vec![
                "-y".into(),
                "@modelcontextprotocol/server-puppeteer".into(),
            ]),
            env: None,
            auto_approve: None,
            source_url: Some("https://github.com/modelcontextprotocol/servers/tree/main/src/puppeteer".into()),
            tags: vec!["browser".into(), "web".into(), "screenshot".into(), "automation".into()],
        },
        CuratedMcpEntry {
            id: "curated-slack".into(),
            name: "Slack".into(),
            description: "Slack workspace integration — read messages, search channels, post to channels.".into(),
            category: "connector".into(),
            transport: "stdio".into(),
            url: None,
            command: Some("npx".into()),
            args: Some(vec![
                "-y".into(),
                "@modelcontextprotocol/server-slack".into(),
            ]),
            env: None,
            auto_approve: None,
            source_url: Some("https://github.com/modelcontextprotocol/servers/tree/main/src/slack".into()),
            tags: vec!["slack".into(), "chat".into(), "messaging".into()],
        },
        CuratedMcpEntry {
            id: "curated-sqlite".into(),
            name: "SQLite".into(),
            description: "SQLite database exploration — inspect schema, run queries, analyze data.".into(),
            category: "data".into(),
            transport: "stdio".into(),
            url: None,
            command: Some("npx".into()),
            args: Some(vec![
                "-y".into(),
                "@modelcontextprotocol/server-sqlite".into(),
            ]),
            env: None,
            auto_approve: Some(vec!["list_tables".into(), "read_query".into(), "describe_table".into()]),
            source_url: Some("https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite".into()),
            tags: vec!["sqlite".into(), "database".into(), "sql".into(), "query".into()],
        },
        CuratedMcpEntry {
            id: "curated-seq".into(),
            name: "Sequential Thinking".into(),
            description: "Structured multi-step reasoning — break down complex problems into sequential thought steps.".into(),
            category: "ai".into(),
            transport: "stdio".into(),
            url: None,
            command: Some("npx".into()),
            args: Some(vec![
                "-y".into(),
                "@anthropic-ai/mcp-server-seq-thinking".into(),
            ]),
            env: None,
            auto_approve: Some(vec![
                "sequential_thinking".into(), "update_step".into(), "list_steps".into(),
            ]),
            source_url: Some("https://github.com/anthropics/anthropic-quickstarts/tree/main/mcp-server-seq-thinking".into()),
            tags: vec!["reasoning".into(), "thinking".into(), "planning".into()],
        },
    ]
}

/// Installs a curated MCP server into the local registry.
pub async fn install_curated_server(
    pool: &SqlitePool,
    curated_id: &str,
) -> Result<McpServer, String> {
    let catalog = list_curated_servers();
    let entry = catalog
        .into_iter()
        .find(|e| e.id == curated_id)
        .ok_or_else(|| format!("Servidor curado '{}' no encontrado en el catalogo", curated_id))?;

    let payload = RegisterServerPayload {
        id: entry.id.clone(),
        name: entry.name.clone(),
        url: entry.url.clone().unwrap_or_default(),
        transport: Some(entry.transport.clone()),
        auth_type: None,
        auth_ref: None,
        auth_token: None,
        command: entry.command.clone(),
        args: entry.args.clone(),
        env: entry.env.clone(),
        headers: None,
        disabled: Some(false),
        auto_approve: entry.auto_approve.clone(),
        timeout_ms: Some(30000),
        tools: None,
    };

    register_server(pool, payload).await.map_err(|e| e.to_string())
}

/// Descubre tools desde una URL HTTP sin persistir en DB (preview).
pub async fn preview_http_tools(
    server_url: &str,
    auth_token: Option<&str>,
) -> Result<Vec<StdioDiscoveredTool>, String> {
    let endpoint = handshake::build_base_url(server_url);
    let client = handshake::build_client(10)
        .map_err(|e| format!("Error creando cliente HTTP: {e}"))?;

    handshake::do_handshake(&client, &endpoint, auth_token).await?;
    let tools = handshake::fetch_tools_list(&client, &endpoint, auth_token, 2).await?;

    let result = tools.iter().map(|tool| {
        StdioDiscoveredTool {
            name: tool.get("name").and_then(|n| n.as_str()).unwrap_or("unknown").to_string(),
            description: tool.get("description").and_then(|d| d.as_str()).unwrap_or("").to_string(),
            input_schema: tool.get("inputSchema").cloned(),
        }
    }).collect();

    Ok(result)
}
