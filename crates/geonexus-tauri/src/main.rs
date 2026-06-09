#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use geonexus_db::DataRepository;

pub mod commands;

pub struct AppState {
    pub db: sqlx::SqlitePool,
    pub repo: DataRepository,
    pub db_path: String,
}

fn main() {
    tauri::Builder::default()
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

            // Gestionar el estado global unificado de la aplicación
            app.manage(AppState { db, repo, db_path: db_path_str });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Fase 1
            commands::data::list_data_assets,
            commands::data::get_data_asset,
            commands::data::get_data_store_metrics,
            commands::data::get_sync_events,
            commands::data::validate_data_asset,
            // Fase 2
            commands::connector::register_local_connector,
            commands::connector::list_connector_files,
            commands::connector::cache_connector_file,
            commands::connector::sync_local_connector,
            // Fase 3
            commands::document::index_document,
            commands::document::list_document_chunks,
            commands::document::list_graph_nodes,
            commands::document::list_graph_edges,
            commands::document::rebuild_knowledge_graph,
            // Fase 4
            commands::containers_mcp::init_containers_mcp,
            commands::containers_mcp::dispatch_container_tool,
            // Fase 6
            commands::llm::ping_llm_provider,
            commands::llm::list_llm_models,
            commands::llm::send_llm_message,
            // Fase 7
            commands::chat::send_message,
            commands::chat::delete_conversation,
            commands::chat::list_conversations,
            commands::chat::list_messages,
            commands::chat::recall_chunks,
            commands::chat::get_project_context
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
