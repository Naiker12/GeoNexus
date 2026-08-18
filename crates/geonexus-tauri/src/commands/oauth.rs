use rand::Rng;
use sha2::{Sha256, Digest};
use tauri::Manager;

#[derive(serde::Serialize, serde::Deserialize)]
pub struct OAuthTokenResponse {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_in: u64,
    pub token_type: String,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct OAuthUserInfo {
    pub name: String,
    pub email: String,
}

#[derive(serde::Serialize)]
pub struct PkceChallenge {
    pub code_verifier: String,
    pub code_challenge: String,
}

#[derive(serde::Serialize)]
pub struct OAuthProviderConfig {
    pub auth_url: String,
    pub client_id: String,
    pub redirect_uri: String,
    pub scope: String,
}

const PKCE_CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

/// Genera un code_verifier aleatorio (128 bytes) y su code_challenge SHA-256.
#[tauri::command]
pub fn generate_pkce_challenge() -> PkceChallenge {
    let mut rng = rand::thread_rng();
    let verifier: String = (0..128)
        .map(|_| {
            let idx = rng.gen_range(0..PKCE_CHARS.len());
            PKCE_CHARS[idx] as char
        })
        .collect();

    let mut hasher = Sha256::new();
    hasher.update(verifier.as_bytes());
    let hash = hasher.finalize();

    let challenge = base64::Engine::encode(
        &base64::engine::general_purpose::URL_SAFE_NO_PAD,
        hash,
    );

    PkceChallenge {
        code_verifier: verifier,
        code_challenge: challenge,
    }
}

/// Construye la URL de autorización OAuth para un proveedor dado.
#[tauri::command]
pub fn build_oauth_url(
    provider: String,
    client_id: String,
    redirect_uri: String,
    scope: String,
    code_challenge: String,
) -> Result<String, String> {
    match provider.as_str() {
        "onedrive" => {
            let tenant = std::env::var("ONEDRIVE_TENANT_ID").unwrap_or_else(|_| "common".into());
            Ok(format!(
                "https://login.microsoftonline.com/{}/oauth2/v2.0/authorize?{}",
                tenant,
                urlencode_params(&[
                    ("client_id", &client_id),
                    ("response_type", "code"),
                    ("redirect_uri", &redirect_uri),
                    ("scope", &scope),
                    ("code_challenge", &code_challenge),
                    ("code_challenge_method", "S256"),
                ])
            ))
        }
        "dropbox" => Ok(format!(
            "https://www.dropbox.com/oauth2/authorize?{}",
            urlencode_params(&[
                ("client_id", &client_id),
                ("response_type", "code"),
                ("redirect_uri", &redirect_uri),
                ("token_access_type", "offline"),
                ("code_challenge", &code_challenge),
                ("code_challenge_method", "S256"),
            ])
        )),
        _ => Err(format!("Proveedor OAuth no soportado: {provider}")),
    }
}

/// Abre el navegador del sistema con la URL de autorización OAuth.
/// Almacena el code_verifier temporalmente en el estado de la app.
#[tauri::command]
pub async fn start_oauth_flow(
    app: tauri::AppHandle,
    provider: String,
    client_id: String,
    redirect_uri: String,
    scope: String,
) -> Result<String, String> {
    let challenge = generate_pkce_challenge();

    let auth_url = build_oauth_url(
        provider.clone(),
        client_id,
        redirect_uri,
        scope,
        challenge.code_challenge,
    )?;

    // Almacenar code_verifier temporal en una variable de entorno (para este proceso)
    std::env::set_var(format!("GX_OAUTH_VERIFIER_{}", provider), &challenge.code_verifier);

    // Abrir navegador del sistema usando tauri-plugin-opener
    use tauri_plugin_opener::OpenerExt;
    app.opener()
        .open_url(&auth_url, None::<&str>)
        .map_err(|e| format!("Error al abrir navegador: {e}"))?;

    Ok(auth_url)
}

fn urlencode_params(params: &[(&str, &str)]) -> String {
    params
        .iter()
        .map(|(k, v)| format!(
            "{}={}",
            urlencoding(k),
            urlencoding(v)
        ))
        .collect::<Vec<_>>()
        .join("&")
}

fn urlencoding(s: &str) -> String {
    let mut result = String::with_capacity(s.len());
    for byte in s.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                result.push(byte as char);
            }
            _ => {
                result.push_str(&format!("%{:02X}", byte));
            }
        }
    }
    result
}

/// Intercambia un código de autorización OAuth por tokens usando PKCE.
#[tauri::command]
pub async fn exchange_oauth_code(
    code: String,
    code_verifier: String,
    client_id: String,
    tenant_id: String,
    redirect_uri: String,
) -> Result<OAuthTokenResponse, String> {
    let client = reqwest::Client::new();
    let params = [
        ("client_id", client_id.as_str()),
        ("code", code.as_str()),
        ("redirect_uri", redirect_uri.as_str()),
        ("grant_type", "authorization_code"),
        ("code_verifier", code_verifier.as_str()),
    ];

    let token_url = format!(
        "https://login.microsoftonline.com/{}/oauth2/v2.0/token",
        tenant_id
    );

    let res = client
        .post(&token_url)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Error al intercambiar código OAuth: {e}"))?;

    let status = res.status();
    let body = res.text().await.unwrap_or_default();

    if !status.is_success() {
        return Err(format!("El endpoint de token devolvió {status}: {body}"));
    }

    serde_json::from_str::<OAuthTokenResponse>(&body)
        .map_err(|e| format!("Error al analizar la respuesta del token: {e}"))
}

/// Obtiene la información del usuario desde Microsoft Graph usando un token de acceso.
#[tauri::command]
pub async fn get_oauth_user_info(
    access_token: String,
) -> Result<OAuthUserInfo, String> {
    let client = reqwest::Client::new();
    let res = client
        .get("https://graph.microsoft.com/v1.0/me")
        .header("Authorization", format!("Bearer {access_token}"))
        .send()
        .await
        .map_err(|e| format!("Error al obtener información del usuario: {e}"))?;

    let status = res.status();
    let body = res.text().await.unwrap_or_default();

    if !status.is_success() {
        return Err(format!("La API Graph devolvió {status}: {body}"));
    }

    #[derive(serde::Deserialize)]
    struct GraphUser {
        display_name: Option<String>,
        mail: Option<String>,
        user_principal_name: Option<String>,
    }

    let user = serde_json::from_str::<GraphUser>(&body)
        .map_err(|e| format!("Error al analizar la información del usuario: {e}"))?;

    Ok(OAuthUserInfo {
        name: user.display_name.unwrap_or_else(|| "Desconocido".into()),
        email: user
            .mail
            .or(user.user_principal_name)
            .unwrap_or_else(|| "desconocido@desconocido.com".into()),
    })
}

/// Almacena un token de acceso OAuth en el llavero local a través del plugin Tauri stronghold.
#[tauri::command]
pub async fn save_oauth_token(
    app: tauri::AppHandle,
    provider: String,
    token_json: String,
) -> Result<(), String> {
    let _key = format!("geonexus_token_{provider}");

    #[cfg(feature = "stronghold")]
    {
        use tauri_plugin_stronghold::StrongholdExt;
        if let Ok(stronghold) = app.try_stronghold() {
            let vault_path = vec!["geonexus".to_string(), "oauth".to_string()];
            if let Ok(mut vault) = stronghold.create_client(b"geonexus-oauth") {
                let _ = vault.write()
                    .to_store(&vault_path, _key.as_bytes(), token_json.as_bytes());
            }
            return Ok(());
        }
    }

    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Error al resolver el directorio de datos de la app: {e}"))?;

    std::fs::create_dir_all(&app_data).map_err(|e| format!("Error al crear el directorio de datos de la app: {e}"))?;

    let file_path = app_data.join(format!("token_{provider}.enc"));
    std::fs::write(&file_path, &token_json)
        .map_err(|e| format!("Error al escribir el archivo de token: {e}"))?;

    Ok(())
}

/// Recupera un token OAuth almacenado del llavero local.
#[tauri::command]
pub async fn get_oauth_token(
    app: tauri::AppHandle,
    provider: String,
) -> Result<Option<String>, String> {
    let _key = format!("geonexus_token_{provider}");

    #[cfg(feature = "stronghold")]
    {
        use tauri_plugin_stronghold::StrongholdExt;
        if let Ok(stronghold) = app.try_stronghold() {
            let vault_path = vec!["geonexus".to_string(), "oauth".to_string()];
            if let Ok(mut vault) = stronghold.create_client(b"geonexus-oauth") {
                if let Ok(data) = vault.read().retrieve_from_store(&vault_path, _key.as_bytes()) {
                    if let Some(bytes) = data {
                        return Ok(String::from_utf8(bytes).ok());
                    }
                }
            }
        }
    }

    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Error al resolver el directorio de datos de la app: {e}"))?;

    let file_path = app_data.join(format!("token_{provider}.enc"));
    if file_path.exists() {
        let data = std::fs::read_to_string(&file_path)
            .map_err(|e| format!("Error al leer el archivo de token: {e}"))?;
        return Ok(Some(data));
    }

    Ok(None)
}
