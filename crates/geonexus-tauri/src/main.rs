#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, AppHandle};
use geonexus_db::DataRepository;

pub mod commands;
mod builtin_skills;

use commands::coding_agent::PermissionState;
use commands::telegram::TelegramState;

pub struct AppState {
    pub db: sqlx::SqlitePool,
    pub repo: DataRepository,
    pub db_path: String,
    pub app_handle: Option<AppHandle>,
}

fn main() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init());

    #[cfg(feature = "dialog")]
    {
        builder = builder.plugin(tauri_plugin_dialog::init());
    }

    #[cfg(feature = "stronghold")]
    {
        builder = builder.plugin(tauri_plugin_stronghold::init());
    }

    builder
        .setup(|app| {
            // Open dev tools in debug mode
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            // Resolver la ruta del app data dir en Tauri v2
            let app_data_dir = app
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| std::env::current_dir().unwrap());
            let db_path = app_data_dir.join("geonexus.db");

            // Inicializar el repositorio asincrónicamente usando el runtime de Tauri
            let repo = tauri::async_runtime::block_on(async {
                DataRepository::new(&db_path).await
            })?;

            let db = repo.pool.clone();

            // Fallback: asegurar columnas de migraciones recientes (por si el binario está desactualizado)
            tauri::async_runtime::block_on(async {
                let _ = sqlx::query("ALTER TABLE mcp_servers ADD COLUMN transport TEXT NOT NULL DEFAULT 'http'").execute(&db).await;
                let _ = sqlx::query("ALTER TABLE mcp_servers ADD COLUMN command TEXT").execute(&db).await;
                let _ = sqlx::query("ALTER TABLE mcp_servers ADD COLUMN args_json TEXT").execute(&db).await;
                let _ = sqlx::query("ALTER TABLE mcp_servers ADD COLUMN env_json TEXT").execute(&db).await;
                let _ = sqlx::query("ALTER TABLE mcp_servers ADD COLUMN headers_json TEXT").execute(&db).await;
                let _ = sqlx::query("ALTER TABLE mcp_servers ADD COLUMN disabled INTEGER NOT NULL DEFAULT 0").execute(&db).await;
                let _ = sqlx::query("ALTER TABLE mcp_servers ADD COLUMN auto_approve_json TEXT").execute(&db).await;
                let _ = sqlx::query("ALTER TABLE mcp_servers ADD COLUMN timeout_ms INTEGER DEFAULT 5000").execute(&db).await;
                let _ = sqlx::query("ALTER TABLE mcp_servers ADD COLUMN tools_count INTEGER").execute(&db).await;
                let _ = sqlx::query("ALTER TABLE mcp_servers ADD COLUMN protocol_version TEXT").execute(&db).await;
                let _ = sqlx::query("ALTER TABLE mcp_servers ADD COLUMN last_error TEXT").execute(&db).await;
                let _ = sqlx::query("ALTER TABLE mcp_servers ADD COLUMN auth_token TEXT").execute(&db).await;
                let _ = sqlx::query("ALTER TABLE mcp_tools ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'))").execute(&db).await;
            });

            let db_path_str = db_path.to_string_lossy().to_string();

            // Guardar la ruta de la base de datos en la variable de entorno global para procesos hijos
            std::env::set_var("GEONEXUS_DB_PATH", &db_path_str);

            // Gestionar el estado global unificado de la aplicación
            let app_handle = app.handle().clone();
            app.manage(AppState { db: db.clone(), repo, db_path: db_path_str, app_handle: Some(app_handle) });
            app.manage(PermissionState::new());
            app.manage(TelegramState::default());

            // Cargar o crear geonexus.config.toml
            let config_path = app_data_dir.join("geonexus.config.toml");
            let config = geonexus_core::config::GeoNexusConfig::load_or_create(&config_path)
                .unwrap_or_default();
            tracing::info!("Config loaded: {} servidores MCP por defecto", config.mcp.default_servers.len());

            // Registrar servidores MCP por defecto
            for server_def in &config.mcp.default_servers {
                let payload = geonexus_mcp::types::RegisterServerPayload {
                    id: server_def.id.clone(),
                    name: server_def.name.clone(),
                    url: server_def.url.clone(),
                    transport: None,
                    auth_type: server_def.auth_type.clone(),
                    auth_ref: server_def.auth_ref.clone(),
                    auth_token: server_def.auth_token.clone(),
                    command: None,
                    args: None,
                    env: None,
                    headers: None,
                    disabled: None,
                    auto_approve: None,
                    timeout_ms: None,
                    tools: None,
                };
                let _ = tauri::async_runtime::block_on(
                    geonexus_mcp::registry::register_server(&db, payload)
                );
            }

            // Sembrar agentes por defecto si es primera ejecución
            let _ = tauri::async_runtime::block_on(
                geonexus_db::agent_repo::seed_default_agents(&db)
            );

            // Instalar skills built-in
            let _ = builtin_skills::install_builtin_skills(app.handle(), &db);

            // Background ping interval para servidores MCP registrados
            let bg_db = db.clone();
            let ping_interval = std::time::Duration::from_secs(config.mcp.ping_interval_secs);
            tauri::async_runtime::spawn(async move {
                let mut interval = tokio::time::interval(ping_interval);
                interval.tick().await; // primer tick inmediato
                loop {
                    interval.tick().await;
                    let servers = match geonexus_mcp::registry::list_servers(&bg_db).await {
                        Ok(s) => s,
                        Err(_) => continue,
                    };
                    for server in servers {
                        let sid = server.id.clone();
                        if server.disabled { continue; }
                        let is_http = server.transport == geonexus_mcp::types::McpTransport::Http
                            || server.transport == geonexus_mcp::types::McpTransport::Sse;
                        if !is_http || server.url.is_empty() {
                            continue;
                        }
                        let url = server.url.clone();
                        let auth_token = server.auth_token.clone()
                            .or_else(|| server.auth_ref.clone());
                        let result = geonexus_mcp::pinger::ping_server_with_auth(
                            &url, auth_token.as_deref(),
                        ).await;
                        let _ = geonexus_mcp::registry::update_server_ping_result(
                            &bg_db, &sid, result.online, result.latency_ms,
                            result.tools_count.map(|c| c as i32),
                            result.protocol_version.as_deref(),
                            result.error.as_deref(),
                        ).await;
                        if !result.online {
                            let _ = sqlx::query(
                                "UPDATE mcp_servers SET error_count = error_count + 1 WHERE id = ?1"
                            )
                            .bind(&sid)
                            .execute(&bg_db)
                            .await;
                        }
                        if result.online {
                            let auth = server.auth_token.clone()
                                .or_else(|| server.auth_ref.clone());
                            let _ = geonexus_mcp::registry::auto_discover_tools(
                                &bg_db, &url, &sid, auth.as_deref(),
                            ).await;
                        }
                        let err_count = server.error_count;
                        let _ = geonexus_mcp::registry::record_server_metric(
                            &bg_db, &sid,
                            if result.online { "online" } else { "offline" },
                            result.latency_ms, err_count,
                        ).await;
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Fase 1
            commands::data::list_data_assets,
            commands::data::get_data_asset,
            commands::data::get_data_store_metrics,
            commands::data::get_sync_events,
            commands::data::validate_data_asset,
            commands::data::delete_data_asset,
            commands::data::get_data_lineage,
            commands::data::reindex_asset,

            // Fase 2
            commands::connector::register_local_connector,
            commands::connector::list_connector_files,
            commands::connector::cache_connector_file,
            commands::connector::sync_local_connector,
            commands::connector::upload_asset_file,
            commands::connector::list_connector_configs,
            commands::connector::exchange_dropbox_oauth_code,
            commands::connector::list_dropbox_folder,
            commands::connector::download_dropbox_file,
            commands::connector::get_onedrive_drive_info,
            commands::connector::list_onedrive_folder,
            commands::connector::download_onedrive_file,
            // Fase 3
            commands::document::index_document,
            commands::document::list_document_chunks,
            commands::graph::list_graph_nodes,
            commands::graph::list_graph_edges,
            commands::graph::search_graph_nodes,
            commands::document::rebuild_knowledge_graph,
            commands::graph::update_node_position,
            // Fase 4
            commands::containers_mcp::init_containers_mcp,
            commands::containers_mcp::dispatch_container_tool,
            // Fase 6
            commands::llm::ping_llm_provider,
            commands::llm::list_llm_models,
            commands::llm::send_llm_message,
            // Analisis
            commands::analysis::get_analysis_metrics,
            commands::analysis::get_token_timeline,
            commands::analysis::get_model_usage,
            commands::analysis::list_analysis_runs,
            commands::analysis::get_skill_usage,
            commands::analysis::export_analysis_traces,
            commands::analysis::get_cost_by_timeframe,
            commands::analysis::get_top_queries,
            // Fase 7
            commands::chat::send_message::send_message,
            commands::chat::delete_conversation,
            commands::chat::list_conversations,
            commands::chat::list_messages,
            commands::chat::recall_chunks,
            commands::chat::get_project_context,
            // OAuth
            commands::oauth::generate_pkce_challenge,
            commands::oauth::build_oauth_url,
            commands::oauth::start_oauth_flow,
            commands::oauth::exchange_oauth_code,
            commands::oauth::get_oauth_user_info,
            commands::oauth::save_oauth_token,
            commands::oauth::get_oauth_token,
            // Filesystem
            commands::filesystem::open_folder_picker,
            commands::filesystem::open_file_picker,
            commands::filesystem::read_file_base64,
            commands::filesystem::validate_folder_path,
            commands::filesystem::list_directory,

            // Agents
            commands::agent::list_agents,
            commands::agent::toggle_agent,
            commands::agent::run_agent_pipeline,
            // Agent Identity
            commands::agent_identity::read_identity_file,
            commands::agent_identity::write_identity_file,
            // Graph Events
            commands::graph_events::clear_ephemeral_nodes,
            commands::graph_events::get_recent_graph_events,

            // Notifications
            commands::notifications::send_os_notification,
            commands::notifications::request_notification_permission,

            // MCP Runtime
            commands::mcp::list_mcp_servers,
            commands::mcp::register_mcp_server,
            commands::mcp::delete_mcp_server,
            commands::mcp::ping_mcp_server,
            commands::mcp::ping_mcp_server_url,
            commands::mcp::list_mcp_tools,
            commands::mcp::call_mcp_tool,
            commands::mcp::list_mcp_allowlist,
            commands::mcp::upsert_mcp_allowlist,
            commands::mcp::delete_mcp_allowlist,
            commands::mcp::import_mcp_config,
            commands::mcp::export_mcp_config,
            commands::mcp::discover_mcp_tools,
            commands::mcp::preview_mcp_tools,

            // Settings
            commands::settings::get_setting,
            commands::settings::set_setting,

            // Graph CRUD & Operations
            commands::graph::delete_graph_node,
            commands::graph::pin_node,
            commands::graph::restore_graph_node,
            commands::graph::list_orphan_nodes,
            commands::graph::merge_nodes,
            commands::graph::get_node_memory_stats,

            // Skills
            commands::skills::list_skills,
            commands::skills::install_skill_from_file,
            commands::skills::install_skill_from_github,
            commands::skills::toggle_skill,
            commands::skills::read_skill_md,
            commands::skills::preview_skill_file,
            
            // Audio
            commands::audio::audio_transcribe,
            commands::audio::audio_synthesize,
            
            // Telegram
            commands::telegram::telegram_save_config,
            commands::telegram::telegram_load_config,
            commands::telegram::telegram_start_polling,
            commands::telegram::telegram_stop_polling,
            commands::telegram::telegram_get_status,
            commands::telegram::telegram_send_message,
            commands::telegram::telegram_send_chat_action,
            commands::telegram::telegram_send_response,
            
            // Coding Agent
            commands::coding_agent::coding_agent_clarify,
            commands::coding_agent::coding_agent_start_generation,
            commands::coding_agent::coding_agent_approve_plan,
            commands::coding_agent::coding_agent_resolve_permission,
            commands::coding_agent::coding_agent_load_project,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
