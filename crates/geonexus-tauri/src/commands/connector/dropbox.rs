use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct DropboxFile {
    pub id: String,
    pub name: String,
    pub path_lower: String,
    pub size: Option<i64>,
    pub is_dir: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DropboxTokenResponse {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_in: u64,
    pub token_type: String,
    pub uid: Option<String>,
    pub account_id: Option<String>,
}

/// Intercambia un código de autorización OAuth por tokens de Dropbox.
#[tauri::command]
pub async fn exchange_dropbox_oauth_code(
    code: String,
    client_id: String,
    client_secret: String,
    redirect_uri: String,
) -> Result<DropboxTokenResponse, String> {
    let client = reqwest::Client::new();
    let params = [
        ("code", code.as_str()),
        ("grant_type", "authorization_code"),
        ("client_id", client_id.as_str()),
        ("client_secret", client_secret.as_str()),
        ("redirect_uri", redirect_uri.as_str()),
    ];

    let res = client
        .post("https://api.dropbox.com/oauth2/token")
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Error al intercambiar código Dropbox OAuth: {e}"))?;

    let status = res.status();
    let body = res.text().await.unwrap_or_default();

    if !status.is_success() {
        return Err(format!("Dropbox token endpoint devolvió {status}: {body}"));
    }

    serde_json::from_str::<DropboxTokenResponse>(&body)
        .map_err(|e| format!("Error al analizar respuesta de token Dropbox: {e}"))
}

/// Lista archivos en la carpeta raíz de Dropbox (no recursivo).
#[tauri::command]
pub async fn list_dropbox_folder(
    access_token: String,
    path: String,
) -> Result<Vec<DropboxFile>, String> {
    let client = reqwest::Client::new();

    let body = serde_json::json!({
        "path": if path.is_empty() || path == "/" { "" } else { &path },
        "recursive": false,
        "include_media_info": false,
        "include_deleted": false,
        "include_has_explicit_shared_members": false,
    });

    let res = client
        .post("https://api.dropboxapi.com/2/files/list_folder")
        .header("Authorization", format!("Bearer {access_token}"))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Error al listar carpeta Dropbox: {e}"))?;

    let status = res.status();
    let response_body = res.text().await.unwrap_or_default();

    if !status.is_success() {
        return Err(format!("Dropbox API devolvió {status}: {response_body}"));
    }

    #[derive(Deserialize)]
    struct ListFolderResponse {
        entries: Vec<ListFolderEntry>,
    }

    #[derive(Deserialize)]
    struct ListFolderEntry {
        #[serde(rename = ".tag")]
        tag: String,
        id: Option<String>,
        name: String,
        path_lower: Option<String>,
        size: Option<i64>,
    }

    let parsed: ListFolderResponse = serde_json::from_str(&response_body)
        .map_err(|e| format!("Error al analizar respuesta de Dropbox: {e}"))?;

    Ok(parsed
        .entries
        .into_iter()
        .map(|e| DropboxFile {
            id: e.id.unwrap_or_else(|| e.name.clone()),
            name: e.name,
            path_lower: e.path_lower.unwrap_or_default(),
            size: e.size,
            is_dir: e.tag == "folder",
        })
        .collect())
}

/// Descarga un archivo de Dropbox y devuelve el contenido como base64.
#[tauri::command]
pub async fn download_dropbox_file(
    access_token: String,
    path: String,
) -> Result<String, String> {
    let client = reqwest::Client::new();

    let arg = serde_json::json!({ "path": path });

    let res = client
        .post("https://content.dropboxapi.com/2/files/download")
        .header("Authorization", format!("Bearer {access_token}"))
        .header("Dropbox-API-Arg", arg.to_string())
        .send()
        .await
        .map_err(|e| format!("Error al descargar archivo Dropbox: {e}"))?;

    let status = res.status();

    if !status.is_success() {
        let error_body = res.text().await.unwrap_or_default();
        return Err(format!("Dropbox download devolvió {status}: {error_body}"));
    }

    let bytes = res
        .bytes()
        .await
        .map_err(|e| format!("Error al leer bytes del archivo: {e}"))?;

    Ok(base64_encode(&bytes))
}

fn base64_encode(data: &[u8]) -> String {
    use base64::Engine;
    base64::engine::general_purpose::STANDARD.encode(data)
}
