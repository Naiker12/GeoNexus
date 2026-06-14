use std::time::Duration;
use serde_json::Value;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::Command;

#[derive(Debug, Clone, serde::Serialize)]
pub struct StdioDiscoveredTool {
    pub name: String,
    pub description: String,
    pub input_schema: Option<Value>,
}

pub async fn discover_tools(
    command: &str,
    args: &[String],
    env: Option<&serde_json::Map<String, Value>>,
    timeout_ms: u64,
) -> Result<Vec<StdioDiscoveredTool>, String> {
    let timeout = Duration::from_millis(timeout_ms);

    let mut cmd = Command::new(command);
    cmd.args(args)
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped());

    if let Some(env_map) = env {
        for (key, val) in env_map {
            if let Some(val_str) = val.as_str() {
                cmd.env(key, val_str);
            }
        }
    }

    let mut child = cmd.spawn().map_err(|e| format!("Error iniciando proceso: {e}"))?;

    let mut stdin = child.stdin.take().ok_or("No se pudo abrir stdin del proceso")?;
    let stdout = child.stdout.take().ok_or("No se pudo abrir stdout del proceso")?;
    let mut reader = BufReader::new(stdout);

    // Step 1: initialize
    let init_req = serde_json::json!({
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

    write_json_line(&mut stdin, &init_req).await?;
    let init_resp = read_json_line(&mut reader, timeout).await?;
    check_error(&init_resp)?;

    // Step 2: notification (no response)
    let notif = serde_json::json!({
        "jsonrpc": "2.0",
        "method": "notifications/initialized"
    });
    write_json_line(&mut stdin, &notif).await?;

    // Step 3: tools/list
    let tools_req = serde_json::json!({
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/list"
    });
    write_json_line(&mut stdin, &tools_req).await?;
    let tools_resp = read_json_line(&mut reader, timeout).await?;
    check_error(&tools_resp)?;

    // Close stdin and wait for process
    let _ = stdin.shutdown().await;
    let _ = tokio::time::timeout(timeout, child.wait()).await;
    let _ = child.kill().await;
    let _ = child.wait().await;

    let tools_arr = tools_resp
        .get("result")
        .and_then(|r| r.get("tools"))
        .and_then(|t| t.as_array())
        .ok_or_else(|| "Respuesta tools/list inválida: falta result.tools".to_string())?;

    Ok(tools_arr
        .iter()
        .map(|t| StdioDiscoveredTool {
            name: t.get("name").and_then(|n| n.as_str()).unwrap_or("unknown").to_string(),
            description: t.get("description").and_then(|d| d.as_str()).unwrap_or("").to_string(),
            input_schema: t.get("inputSchema").cloned(),
        })
        .collect())
}

async fn write_json_line(stdin: &mut tokio::process::ChildStdin, json: &Value) -> Result<(), String> {
    let mut msg = serde_json::to_string(json).map_err(|e| format!("Error serializando JSON: {e}"))?;
    msg.push('\n');
    stdin
        .write_all(msg.as_bytes())
        .await
        .map_err(|e| format!("Error escribiendo a stdin: {e}"))?;
    stdin
        .flush()
        .await
        .map_err(|e| format!("Error flush stdin: {e}"))?;
    Ok(())
}

async fn read_json_line(reader: &mut BufReader<tokio::process::ChildStdout>, timeout: Duration) -> Result<Value, String> {
    let mut line = String::new();
    tokio::time::timeout(timeout, reader.read_line(&mut line))
        .await
        .map_err(|_| "Timeout esperando respuesta del proceso".to_string())?
        .map_err(|e| format!("Error leyendo stdout: {e}"))?;

    if line.is_empty() {
        return Err("El proceso cerró stdout sin enviar respuesta".to_string());
    }

    serde_json::from_str(&line).map_err(|e| format!("Error parseando respuesta JSON: {e}"))
}

fn check_error(response: &Value) -> Result<(), String> {
    if let Some(err) = response.get("error") {
        return Err(err
            .get("message")
            .and_then(|m| m.as_str())
            .unwrap_or("Error JSON-RPC")
            .to_string());
    }
    Ok(())
}
