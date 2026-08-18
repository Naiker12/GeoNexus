use serde::{Deserialize, Serialize};

const GRAPH_BASE: &str = "https://graph.microsoft.com/v1.0";

#[derive(Debug, Serialize, Deserialize)]
pub struct OneDriveItem {
    pub id: String,
    pub name: String,
    pub path: String,
    pub size: Option<i64>,
    pub is_dir: bool,
    pub last_modified: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OneDriveDriveInfo {
    pub id: String,
    pub name: String,
    pub total_bytes: Option<i64>,
    pub used_bytes: Option<i64>,
}

/// Obtiene información del drive de OneDrive del usuario autenticado.
#[tauri::command]
pub async fn get_onedrive_drive_info(
    access_token: String,
) -> Result<OneDriveDriveInfo, String> {
    let client = reqwest::Client::new();
    let res = client
        .get(format!("{GRAPH_BASE}/me/drive"))
        .header("Authorization", format!("Bearer {access_token}"))
        .send()
        .await
        .map_err(|e| format!("Error al obtener info del drive: {e}"))?;

    let status = res.status();
    let body = res.text().await.unwrap_or_default();

    if !status.is_success() {
        return Err(format!("Graph API devolvió {status}: {body}"));
    }

    #[derive(Deserialize)]
    struct DriveResponse {
        id: String,
        name: Option<String>,
        quota: Option<QuotaInfo>,
    }

    #[derive(Deserialize)]
    struct QuotaInfo {
        total: Option<i64>,
        used: Option<i64>,
    }

    let drive: DriveResponse = serde_json::from_str(&body)
        .map_err(|e| format!("Error al analizar respuesta del drive: {e}"))?;

    Ok(OneDriveDriveInfo {
        id: drive.id,
        name: drive.name.unwrap_or_else(|| "OneDrive".into()),
        total_bytes: drive.quota.as_ref().and_then(|q| q.total),
        used_bytes: drive.quota.as_ref().and_then(|q| q.used),
    })
}

/// Lista archivos y carpetas en una ruta de OneDrive.
/// path = "" lista la raíz.
#[tauri::command]
pub async fn list_onedrive_folder(
    access_token: String,
    path: String,
) -> Result<Vec<OneDriveItem>, String> {
    let client = reqwest::Client::new();

    let endpoint = if path.is_empty() || path == "/" {
        format!("{GRAPH_BASE}/me/drive/root/children")
    } else {
        let clean = path.trim_start_matches('/');
        format!("{GRAPH_BASE}/me/drive/root:/{clean}:/children")
    };

    let res = client
        .get(&endpoint)
        .header("Authorization", format!("Bearer {access_token}"))
        .send()
        .await
        .map_err(|e| format!("Error al listar carpeta OneDrive: {e}"))?;

    let status = res.status();
    let body = res.text().await.unwrap_or_default();

    if !status.is_success() {
        return Err(format!("Graph API devolvió {status}: {body}"));
    }

    #[derive(Deserialize)]
    struct GraphChildrenResponse {
        value: Vec<GraphItem>,
    }

    #[derive(Deserialize)]
    struct GraphItem {
        id: String,
        name: String,
        size: Option<i64>,
        folder: Option<serde_json::Value>,
        last_modified_date_time: Option<String>,
    }

    let parsed: GraphChildrenResponse = serde_json::from_str(&body)
        .map_err(|e| format!("Error al analizar respuesta de OneDrive: {e}"))?;

    Ok(parsed
        .value
        .into_iter()
        .map(|item| {
            let parent_path = if path.is_empty() || path == "/" {
                String::new()
            } else {
                format!("/{}", path.trim_start_matches('/'))
            };
            OneDriveItem {
                id: item.id,
                name: item.name.clone(),
                path: format!("{}/{}", parent_path, item.name).trim_start_matches('/').to_string(),
                size: item.size,
                is_dir: item.folder.is_some(),
                last_modified: item.last_modified_date_time,
            }
        })
        .collect())
}

/// Descarga un archivo de OneDrive y devuelve el contenido como base64.
/// path ej: "Documentos/informe.pdf"
#[tauri::command]
pub async fn download_onedrive_file(
    access_token: String,
    path: String,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let clean = path.trim_start_matches('/');
    let endpoint = format!("{GRAPH_BASE}/me/drive/root:/{clean}:/content");

    let res = client
        .get(&endpoint)
        .header("Authorization", format!("Bearer {access_token}"))
        .send()
        .await
        .map_err(|e| format!("Error al descargar archivo OneDrive: {e}"))?;

    let status = res.status();

    if !status.is_success() {
        let error_body = res.text().await.unwrap_or_default();
        return Err(format!("Graph API download devolvió {status}: {error_body}"));
    }

    let bytes = res
        .bytes()
        .await
        .map_err(|e| format!("Error al leer bytes del archivo: {e}"))?;

    use base64::Engine;
    Ok(base64::engine::general_purpose::STANDARD.encode(bytes))
}
