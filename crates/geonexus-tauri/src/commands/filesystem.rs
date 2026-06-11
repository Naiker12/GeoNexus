/// Desktop agent commands for local file system access.
/// Provides folder picker, file watcher, and file upload capabilities.

/// Opens the native OS folder picker dialog and returns the selected path.
/// Uses tauri-plugin-dialog for native file picker.
#[tauri::command]
pub async fn open_folder_picker(
    app: tauri::AppHandle,
) -> Result<Option<String>, String> {
    #[cfg(feature = "dialog")]
    {
        use tauri_plugin_dialog::DialogExt;
        let folder = app
            .dialog()
            .file()
            .blocking_pick_folder();

        return Ok(folder.map(|p| p.to_string()));
    }

    #[cfg(not(feature = "dialog"))]
    {
        let _ = app;
        Err("Folder picker not available: tauri-plugin-dialog not enabled".into())
    }
}

/// Opens the native OS file picker dialog and returns the selected file paths.
#[tauri::command]
pub async fn open_file_picker(
    app: tauri::AppHandle,
    extensions: Option<Vec<String>>,
) -> Result<Option<Vec<String>>, String> {
    #[cfg(feature = "dialog")]
    {
        use tauri_plugin_dialog::DialogExt;
        let mut dialog = app.dialog().file();
        if let Some(exts) = extensions {
            let filter_exts: Vec<&str> = exts.iter().map(|e| e.as_str()).collect();
            dialog = dialog.add_filter("Supported", &filter_exts);
        }
        let files = dialog.blocking_pick_files();
        return Ok(files.map(|f| {
            f.into_iter()
                .map(|p| p.to_string())
                .collect()
        }));
    }

    #[cfg(not(feature = "dialog"))]
    {
        let _ = app;
        let _ = extensions;
        Err("File picker not available: tauri-plugin-dialog not enabled".into())
    }
}

/// Reads a file from disk and returns its contents as base64-encoded bytes.
/// Used to upload files from the local file system.
#[tauri::command]
pub async fn read_file_base64(
    path: String,
) -> Result<String, String> {
    use std::io::Read;

    let mut file = std::fs::File::open(&path)
        .map_err(|e| format!("Error opening file {path}: {e}"))?;

    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer)
        .map_err(|e| format!("Error reading file {path}: {e}"))?;

    Ok(base64_encode(&buffer))
}

fn base64_encode(data: &[u8]) -> String {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = String::new();
    for chunk in data.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = chunk.get(1).copied().unwrap_or(0) as u32;
        let b2 = chunk.get(2).copied().unwrap_or(0) as u32;
        let triple = (b0 << 16) | (b1 << 8) | b2;
        result.push(CHARS[((triple >> 18) & 0x3F) as usize] as char);
        result.push(CHARS[((triple >> 12) & 0x3F) as usize] as char);
        if chunk.len() > 1 {
            result.push(CHARS[((triple >> 6) & 0x3F) as usize] as char);
        } else {
            result.push('=');
        }
        if chunk.len() > 2 {
            result.push(CHARS[(triple & 0x3F) as usize] as char);
        } else {
            result.push('=');
        }
    }
    result
}

/// Validates that a given path exists and is a directory.
#[tauri::command]
pub async fn validate_folder_path(path: String) -> Result<bool, String> {
    let p = std::path::Path::new(&path);
    Ok(p.exists() && p.is_dir())
}

/// Lists the contents of a directory (non-recursive).
#[tauri::command]
pub async fn list_directory(
    path: String,
    include_extensions: Option<Vec<String>>,
) -> Result<Vec<DirEntry>, String> {
    let dir = std::path::Path::new(&path);
    if !dir.exists() || !dir.is_dir() {
        return Err(format!("Directory not found: {path}"));
    }

    let mut entries = Vec::new();
    let mut reader = std::fs::read_dir(dir)
        .map_err(|e| format!("Error reading directory {path}: {e}"))?;

    while let Some(entry) = reader.next().transpose().map_err(|e| e.to_string())? {
        let file_type = entry.file_type().map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files
        if name.starts_with('.') {
            continue;
        }

        // Filter by extension if specified
        if let Some(ref exts) = include_extensions {
            if !file_type.is_dir() {
                let ext = std::path::Path::new(&name)
                    .extension()
                    .and_then(|s| s.to_str())
                    .unwrap_or("")
                    .to_lowercase();
                if !exts.contains(&ext) {
                    continue;
                }
            }
        }

        entries.push(DirEntry {
            name,
            path: entry.path().to_string_lossy().to_string(),
            is_dir: file_type.is_dir(),
            size_bytes: if file_type.is_file() {
                entry.metadata().ok().map(|m| m.len() as i64)
            } else {
                None
            },
        });
    }

    entries.sort_by(|a, b| {
        if a.is_dir != b.is_dir {
            b.is_dir.cmp(&a.is_dir)
        } else {
            a.name.cmp(&b.name)
        }
    });

    Ok(entries)
}

#[derive(serde::Serialize)]
pub struct DirEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size_bytes: Option<i64>,
}
