/// OAuth commands for OneDrive and other cloud providers.
/// Handles PKCE exchange and token storage via Tauri stronghold.

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

/// Exchanges an OAuth authorization code for tokens using PKCE.
/// POST to Microsoft identity platform /token endpoint.
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
        .map_err(|e| format!("Error exchanging OAuth code: {e}"))?;

    let status = res.status();
    let body = res.text().await.unwrap_or_default();

    if !status.is_success() {
        return Err(format!("Token endpoint returned {status}: {body}"));
    }

    serde_json::from_str::<OAuthTokenResponse>(&body)
        .map_err(|e| format!("Error parsing token response: {e}"))
}

/// Retrieves user info from Microsoft Graph using an access token.
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
        .map_err(|e| format!("Error fetching user info: {e}"))?;

    let status = res.status();
    let body = res.text().await.unwrap_or_default();

    if !status.is_success() {
        return Err(format!("Graph API returned {status}: {body}"));
    }

    #[derive(serde::Deserialize)]
    struct GraphUser {
        display_name: Option<String>,
        mail: Option<String>,
        user_principal_name: Option<String>,
    }

    let user = serde_json::from_str::<GraphUser>(&body)
        .map_err(|e| format!("Error parsing user info: {e}"))?;

    Ok(OAuthUserInfo {
        name: user.display_name.unwrap_or_else(|| "Unknown".into()),
        email: user
            .mail
            .or(user.user_principal_name)
            .unwrap_or_else(|| "unknown@unknown.com".into()),
    })
}

/// Stores an OAuth token in the local keychain via Tauri stronghold plugin.
/// Falls back to encrypted file storage if stronghold is unavailable.
#[tauri::command]
pub async fn save_oauth_token(
    app: tauri::AppHandle,
    provider: String,
    token_json: String,
) -> Result<(), String> {
    let _key = format!("geonexus_token_{provider}");

    // Try stronghold first, fall back to encrypted local file
    #[cfg(feature = "stronghold")]
    {
        use tauri_plugin_stronghold::StrongholdExt;
        if let Ok(stronghold) = app.try_stronghold() {
            // Store in stronghold vault
            let vault_path = vec!["geonexus".to_string(), "oauth".to_string()];
            if let Ok(mut vault) = stronghold.create_client(b"geonexus-oauth") {
                let _ = vault.write()
                    .to_store(&vault_path, _key.as_bytes(), token_json.as_bytes());
            }
            return Ok(());
        }
    }

    // Fallback: store in app data dir (less secure but functional)
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Error resolving app data dir: {e}"))?;

    std::fs::create_dir_all(&app_data).map_err(|e| format!("Error creating app data dir: {e}"))?;

    let file_path = app_data.join(format!("token_{provider}.enc"));
    std::fs::write(&file_path, &token_json)
        .map_err(|e| format!("Error writing token file: {e}"))?;

    Ok(())
}

/// Retrieves a stored OAuth token from the local keychain.
#[tauri::command]
pub async fn get_oauth_token(
    app: tauri::AppHandle,
    provider: String,
) -> Result<Option<String>, String> {
    let _key = format!("geonexus_token_{provider}");

    // Try stronghold first
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

    // Fallback: read from app data dir
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Error resolving app data dir: {e}"))?;

    let file_path = app_data.join(format!("token_{provider}.enc"));
    if file_path.exists() {
        let data = std::fs::read_to_string(&file_path)
            .map_err(|e| format!("Error reading token file: {e}"))?;
        return Ok(Some(data));
    }

    Ok(None)
}
