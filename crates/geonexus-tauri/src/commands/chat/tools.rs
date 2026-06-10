use std::path::PathBuf;
use serde_json::json;

use crate::commands::llm::project_root;

const TEXT_EXTENSIONS: &[&str] = &[
    "rs", "ts", "tsx", "js", "jsx", "py", "json", "toml", "md", "css", "html",
    "yml", "yaml", "sql", "sh", "ps1", "bat", "env", "txt", "xml", "svg",
    "vue", "svelte", "astro", "mjs", "cjs", "mts", "cts",
];

pub fn get_tool_definitions() -> Vec<serde_json::Value> {
    vec![
        json!({
            "type": "function",
            "function": {
                "name": "read_file",
                "description": "Lee el contenido de un archivo del proyecto. Limite: 100 KB.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "path": {
                            "type": "string",
                            "description": "Ruta relativa al directorio raiz del proyecto"
                        }
                    },
                    "required": ["path"]
                }
            }
        }),
        json!({
            "type": "function",
            "function": {
                "name": "search_code",
                "description": "Busca un patron de texto en los archivos del proyecto (como grep). Retorna hasta 20 resultados con ruta, numero de linea y contenido.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "pattern": {
                            "type": "string",
                            "description": "Patron a buscar (case-insensitive)"
                        },
                        "path": {
                            "type": "string",
                            "description": "Subdirectorio donde buscar (opcional, por defecto raiz)"
                        }
                    },
                    "required": ["pattern"]
                }
            }
        }),
        json!({
            "type": "function",
            "function": {
                "name": "list_directory",
                "description": "Lista archivos y directorios dentro de una ruta del proyecto.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "path": {
                            "type": "string",
                            "description": "Ruta relativa al proyecto (por defecto \".\")"
                        }
                    },
                    "required": []
                }
            }
        }),
        json!({
            "type": "function",
            "function": {
                "name": "glob_files",
                "description": "Busca archivos que coinciden con un patron glob (ej: **/*.rs, src/**/*.ts).",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "pattern": {
                            "type": "string",
                            "description": "Patron glob"
                        }
                    },
                    "required": ["pattern"]
                }
            }
        }),
    ]
}

pub fn execute_tool_call(tc: &serde_json::Value) -> String {
    let name = tc["function"]["name"].as_str().unwrap_or("").to_string();
    let args_str = tc["function"]["arguments"]
        .as_str()
        .unwrap_or("{}");
    let args: serde_json::Value =
        serde_json::from_str(args_str).unwrap_or(json!({}));

    let root = project_root();

    match name.as_str() {
        "read_file" => cmd_read_file(&args, &root),
        "search_code" => cmd_search_code(&args, &root),
        "list_directory" => cmd_list_directory(&args, &root),
        "glob_files" => cmd_glob_files(&args, &root),
        _ => format!("Error: herramienta desconocida '{name}'"),
    }
}

fn is_text_file(path: &std::path::Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| TEXT_EXTENSIONS.contains(&ext.to_lowercase().as_str()))
        .unwrap_or(false)
}

fn walk_text_files(dir: &PathBuf, root: &PathBuf, max_depth: usize) -> Vec<PathBuf> {
    let mut result = vec![];
    let mut stack = vec![(dir.clone(), 0usize)];
    while let Some((current, depth)) = stack.pop() {
        if depth > max_depth {
            continue;
        }
        if let Ok(entries) = std::fs::read_dir(&current) {
            for entry in entries.flatten() {
                let path = entry.path();
                if !path.starts_with(root) {
                    continue;
                }
                if let Ok(ft) = entry.file_type() {
                    if ft.is_dir() {
                        if entry
                            .file_name()
                            .to_str()
                            .map(|s| s.starts_with('.'))
                            .unwrap_or(false)
                        {
                            continue;
                        }
                        stack.push((path, depth + 1));
                    } else if ft.is_file() && is_text_file(&path) {
                        if entry
                            .file_name()
                            .to_str()
                            .map(|s| s.starts_with('.'))
                            .unwrap_or(false)
                        {
                            continue;
                        }
                        result.push(path);
                    }
                }
            }
        }
    }
    result
}

fn cmd_read_file(args: &serde_json::Value, root: &PathBuf) -> String {
    let path = args["path"].as_str().unwrap_or("");
    if path.is_empty() {
        return "Error: path requerido".into();
    }
    let full_path = root.join(path);
    if !full_path.starts_with(root) {
        return "Error: path fuera del directorio del proyecto".into();
    }
    match std::fs::read_to_string(&full_path) {
        Ok(content) => {
            if content.len() > 100_000 {
                let truncated: String = content.chars().take(100_000).collect();
                format!("{}...(truncado, {} caracteres totales)", truncated, content.len())
            } else {
                content
            }
        }
        Err(e) => format!("Error al leer archivo: {e}"),
    }
}

fn cmd_search_code(args: &serde_json::Value, root: &PathBuf) -> String {
    let pattern = args["pattern"].as_str().unwrap_or("");
    if pattern.is_empty() {
        return "Error: pattern requerido".into();
    }

    let subpath = args["path"].as_str().unwrap_or("");
    let search_dir = if subpath.is_empty() {
        root.clone()
    } else {
        root.join(subpath)
    };

    if !search_dir.starts_with(root) {
        return "Error: path fuera del directorio del proyecto".into();
    }

    let pattern_lower = pattern.to_lowercase();
    let files = walk_text_files(&search_dir, root, 4);
    let mut results: Vec<String> = vec![];

    'files: for file in &files {
        let Ok(content) = std::fs::read_to_string(file) else {
            continue;
        };
        let rel = file.strip_prefix(root).unwrap_or(file);
        for (i, line) in content.lines().enumerate() {
            if line.to_lowercase().contains(&pattern_lower) {
                results.push(format!(
                    "{}:{}: {}",
                    rel.display(),
                    i + 1,
                    line.trim()
                ));
                if results.len() >= 20 {
                    break 'files;
                }
            }
        }
    }

    if results.is_empty() {
        format!("No se encontraron resultados para: {pattern}")
    } else {
        results.join("\n")
    }
}

fn cmd_list_directory(args: &serde_json::Value, root: &PathBuf) -> String {
    let path = args["path"].as_str().unwrap_or(".");
    let full_path = root.join(path);
    if !full_path.starts_with(root) {
        return "Error: path fuera del directorio del proyecto".into();
    }

    match std::fs::read_dir(&full_path) {
        Ok(entries) => {
            let mut items: Vec<String> = entries
                .filter_map(|e| e.ok())
                .map(|e| {
                    let name = e.file_name().to_string_lossy().to_string();
                    let kind = if e.file_type().map(|t| t.is_dir()).unwrap_or(false) {
                        "DIR"
                    } else {
                        "FILE"
                    };
                    format!("  [{kind}] {name}")
                })
                .collect();
            items.sort();
            let mut out = format!("Contenido de {}:\n", full_path.display());
            out.push_str(&items.join("\n"));
            out
        }
        Err(e) => format!("Error al listar directorio: {e}"),
    }
}

fn cmd_glob_files(args: &serde_json::Value, root: &PathBuf) -> String {
    let pattern = args["pattern"].as_str().unwrap_or("");
    if pattern.is_empty() {
        return "Error: pattern requerido".into();
    }

    let all_files = walk_text_files(root, root, 5);
    let mut matches: Vec<String> = vec![];

    for file in &all_files {
        let rel = file.strip_prefix(root).unwrap_or(file).to_string_lossy();
        let rel_normalized = rel.replace('\\', "/");
        if simple_glob_match(&rel_normalized, pattern) {
            matches.push(rel_normalized);
        }
        if matches.len() >= 50 {
            break;
        }
    }

    if matches.is_empty() {
        format!("No se encontraron archivos para: {pattern}")
    } else {
        matches.join("\n")
    }
}

fn simple_glob_match(name: &str, pattern: &str) -> bool {
    let name = name.replace('\\', "/").to_lowercase();
    let pattern = pattern.replace('\\', "/").to_lowercase();

    if pattern.contains("**") {
        let parts: Vec<&str> = pattern.split("**").collect();
        if parts.len() == 2 {
            let prefix = parts[0].trim_end_matches('/');
            let suffix = parts[1].trim_start_matches('/');
            return name.starts_with(prefix) && name.ends_with(suffix);
        }
        return name.starts_with(&pattern);
    }

    if pattern.contains('*') {
        let parts: Vec<&str> = pattern.split('*').collect();
        if parts.len() == 2 {
            return name.starts_with(parts[0]) && name.ends_with(parts[1]);
        }
    }

    name == pattern
}
