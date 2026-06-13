use sqlx::SqlitePool;
use uuid::Uuid;
use crate::types::*;

pub async fn list_servers(pool: &SqlitePool) -> Result<Vec<McpServer>, sqlx::Error> {
    let rows = sqlx::query_as::<_, McpServerRow>(
        "SELECT id, name, url, status, auth_type, auth_ref, latency_ms, error_count, description, last_ping_at
         FROM mcp_servers ORDER BY created_at ASC"
    )
    .fetch_all(pool)
    .await?;

    Ok(rows.into_iter().map(McpServer::from).collect())
}

pub async fn register_server(pool: &SqlitePool, payload: RegisterServerPayload) -> Result<McpServer, sqlx::Error> {
    sqlx::query(
        "INSERT INTO mcp_servers (id, name, url, status, auth_type, auth_ref, description)
         VALUES (?1, ?2, ?3, 'pending', ?4, ?5, ?6)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           url = excluded.url,
           auth_type = excluded.auth_type,
           auth_ref = excluded.auth_ref,
           description = excluded.description,
           updated_at = datetime('now')"
    )
    .bind(&payload.id)
    .bind(&payload.name)
    .bind(&payload.url)
    .bind(&payload.auth_type)
    .bind(&payload.auth_ref)
    .bind(&payload.name)
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
    let row = sqlx::query_as::<_, McpServerRow>(
        "SELECT id, name, url, status, auth_type, auth_ref, latency_ms, error_count, description, last_ping_at
         FROM mcp_servers WHERE id = ?1"
    )
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
    let tool_id = Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO mcp_tools (id, server_id, name, category, description, args, result, status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'ready')
         ON CONFLICT(id) DO UPDATE SET
           category = excluded.category,
           description = excluded.description,
           args = excluded.args,
           result = excluded.result"
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
