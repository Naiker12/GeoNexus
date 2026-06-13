#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, AppHandle};
use geonexus_db::DataRepository;

pub mod commands;
mod builtin_skills;

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
            let db_path_str = db_path.to_string_lossy().to_string();

            // Guardar la ruta de la base de datos en la variable de entorno global para procesos hijos
            std::env::set_var("GEONEXUS_DB_PATH", &db_path_str);

            // Gestionar el estado global unificado de la aplicación
            let app_handle = app.handle().clone();
            app.manage(AppState { db: db.clone(), repo, db_path: db_path_str, app_handle: Some(app_handle) });

            // Sembrar agentes por defecto si es primera ejecución
            let _ = tauri::async_runtime::block_on(
                geonexus_db::agent_repo::seed_default_agents(&db)
            );

            // Instalar skills built-in
            let _ = builtin_skills::install_builtin_skills(app.handle(), &db);

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

            // Settings
            commands::settings::get_setting,
            commands::settings::set_setting,

            // Graph CRUD & Operations
            commands::graph::delete_graph_node,
            commands::graph::pin_node,
            commands::graph::restore_graph_node,
            commands::graph::list_orphan_nodes,
            commands::graph::merge_nodes,

            // Skills
            commands::skills::list_skills,
            commands::skills::install_skill_from_file,
            commands::skills::install_skill_from_github,
            commands::skills::toggle_skill,
            commands::skills::read_skill_md,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
