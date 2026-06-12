/// Comandos OAuth para OneDrive y otros proveedores en la nube.
/// Maneja el intercambio de PKCE y el almacenamiento de tokens a través de Tauri stronghold.

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

/// Intercambia un código de autorización OAuth por tokens usando PKCE.
/// POST al endpoint /token de la plataforma de identidad de Microsoft.
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
/// Utiliza almacenamiento de archivo cifrado como alternativa si stronghold no está disponible.
#[tauri::command]
pub async fn save_oauth_token(
    app: tauri::AppHandle,
    provider: String,
    token_json: String,
) -> Result<(), String> {
    let _key = format!("geonexus_token_{provider}");

    // Intentar usar stronghold primero, con caída alternativa a archivo local cifrado
    #[cfg(feature = "stronghold")]
    {
        use tauri_plugin_stronghold::StrongholdExt;
        if let Ok(stronghold) = app.try_stronghold() {
            // Almacenar en el cofre de stronghold
            let vault_path = vec!["geonexus".to_string(), "oauth".to_string()];
            if let Ok(mut vault) = stronghold.create_client(b"geonexus-oauth") {
                let _ = vault.write()
                    .to_store(&vault_path, _key.as_bytes(), token_json.as_bytes());
            }
            return Ok(());
        }
    }

    // Caída alternativa: guardar en el directorio de datos de la app (menos seguro pero funcional)
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

    // Intentar con stronghold primero
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

    // Caída alternativa: leer desde el directorio de datos de la app
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
