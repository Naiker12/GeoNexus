#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use geonexus_db::DataRepository;

pub mod commands;

pub struct AppState {
    pub db: sqlx::SqlitePool,
    pub repo: DataRepository,
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
            let db_url = format!("sqlite://{}", db_path.to_string_lossy());

            // Inicializar el repositorio asincrónicamente usando el runtime de Tauri
            let repo = tauri::async_runtime::block_on(async {
                DataRepository::new(&db_url).await
            })?;

            let db = repo.pool.clone();

            // Gestionar el estado global unificado de la aplicación
            app.manage(AppState { db, repo });
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
            commands::connector::sync_local_connector
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
