#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;

use geonexus_core::{DataAsset, DataStoreMetric, SyncEvent};
use geonexus_db::DataRepository;

type DataState = Mutex<DataRepository>;

#[tauri::command]
fn list_data_assets(project_id: String, state: tauri::State<DataState>) -> Vec<DataAsset> {
    state.lock().expect("data repository poisoned").list_data_assets(&project_id)
}

#[tauri::command]
fn get_data_asset(asset_id: String, state: tauri::State<DataState>) -> Option<DataAsset> {
    state.lock().expect("data repository poisoned").get_data_asset(&asset_id)
}

#[tauri::command]
fn get_data_store_metrics(
    project_id: String,
    state: tauri::State<DataState>,
) -> Vec<DataStoreMetric> {
    state
        .lock()
        .expect("data repository poisoned")
        .get_data_store_metrics(&project_id)
}

#[tauri::command]
fn get_sync_events(project_id: String, state: tauri::State<DataState>) -> Vec<SyncEvent> {
    state.lock().expect("data repository poisoned").get_sync_events(&project_id)
}

fn main() {
    tauri::Builder::default()
        .manage(Mutex::new(DataRepository::seeded()))
        .invoke_handler(tauri::generate_handler![
            list_data_assets,
            get_data_asset,
            get_data_store_metrics,
            get_sync_events
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
