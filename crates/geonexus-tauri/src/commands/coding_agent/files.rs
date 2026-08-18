use std::path::PathBuf;
use super::types::ProjectFileEntry;

/// Gets project context text for LLM prompt construction.
pub async fn get_project_context_text(
    project_path: &str,
    facade: &geonexus_fs_mcp::facade::FilesystemMcpFacade,
) -> String {
    let base = PathBuf::from(project_path);

    if facade.path_guard().validate(&base).is_err() {
        return "Proyecto no accesible (fuera de las rutas permitidas).".to_string();
    }

    if !base.exists() {
        return "Proyecto nuevo (sin archivos existentes).".to_string();
    }

    let mut parts = Vec::new();
    if let Ok(mut entries) = tokio::fs::read_dir(&base).await {
        while let Ok(Some(entry)) = entries.next_entry().await {
            let path = entry.path();
            if path.is_file() {
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    if let Ok(content) = tokio::fs::read_to_string(&path).await {
                        let preview: String = content.chars().take(200).collect();
                        parts.push(format!("--- {}:\n{}", name, preview));
                    }
                }
            }
        }
    }

    if parts.is_empty() {
        "Proyecto nuevo (directorio vacio).".to_string()
    } else {
        format!("Archivos existentes en el proyecto:\n{}", parts.join("\n"))
    }
}

/// Collects files from a directory recursively, ignoring common build dirs.
pub async fn collect_project_files(
    dir: &PathBuf,
    base_prefix: &str,
    facade: &geonexus_fs_mcp::facade::FilesystemMcpFacade,
) -> Vec<ProjectFileEntry> {
    let mut entries = Vec::new();
    let ignore_dirs = ["node_modules", "target", ".git", "dist", "build", "chroma_db", ".venv", "__pycache__"];

    if facade.path_guard().validate(dir).is_err() {
        return entries;
    }

    if let Ok(mut read_dir) = tokio::fs::read_dir(dir).await {
        while let Ok(Some(entry)) = read_dir.next_entry().await {
            let path = entry.path();
            let file_name = entry.file_name().to_string_lossy().to_string();

            if ignore_dirs.contains(&file_name.as_str()) {
                continue;
            }

            let relative = if base_prefix.is_empty() {
                file_name.clone()
            } else {
                format!("{}/{}", base_prefix, file_name)
            };

            if path.is_dir() {
                let children = Box::pin(collect_project_files(&path, &relative, facade)).await;
                entries.push(ProjectFileEntry {
                    path: relative.clone(),
                    name: file_name,
                    type_: "directory".to_string(),
                    content: String::new(),
                    language: String::new(),
                    is_original: true,
                });
                entries.extend(children);
            } else if path.is_file() {
                let content = tokio::fs::read_to_string(&path).await.unwrap_or_default();
                let ext = path.extension()
                    .and_then(|e| e.to_str())
                    .unwrap_or("")
                    .to_string();
                let language = match ext.as_str() {
                    "html" | "htm" => "html",
                    "css" => "css",
                    "js" | "mjs" => "javascript",
                    "ts" | "tsx" => "typescript",
                    "jsx" => "jsx",
                    "py" => "python",
                    "rs" => "rust",
                    "json" => "json",
                    "md" => "markdown",
                    "toml" => "toml",
                    "yaml" | "yml" => "yaml",
                    "sql" => "sql",
                    "sh" | "bash" => "shell",
                    _ => "text",
                }.to_string();
                entries.push(ProjectFileEntry {
                    path: relative,
                    name: file_name,
                    type_: "file".to_string(),
                    content,
                    language,
                    is_original: true,
                });
            }
        }
    }
    entries
}
