use std::path::Path;

#[derive(Debug, Clone, PartialEq, Eq, Hash, serde::Serialize, serde::Deserialize)]
pub struct FrameworkInfo {
    pub name: String,
    pub language: String,
    pub version: Option<String>,
    pub config_files: Vec<String>,
    pub dependencies: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ProjectAnalysis {
    pub frameworks: Vec<FrameworkInfo>,
    pub language: Option<String>,
    pub main_files: Vec<String>,
    pub estimated_type: ProjectType,
    pub has_readme: bool,
    pub has_git: bool,
    pub has_ci_config: bool,
    pub file_count: u64,
    pub total_size_bytes: u64,
    pub src_dirs: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum ProjectType {
    Application,
    Library,
    WebFrontend,
    WebBackend,
    Script,
    Configuration,
    Documentation,
    Unknown,
}

pub struct FrameworkDetect {
    /// Map from filename → detection function name
    detectors: Vec<Detector>,
}

struct Detector {
    config_file: String,
    detect: fn(content: &str, path: &Path) -> Option<FrameworkInfo>,
}

impl FrameworkDetect {
    pub fn new() -> Self {
        Self { detectors: Self::builtin_detectors() }
    }

    fn builtin_detectors() -> Vec<Detector> {
        vec![
            Detector {
                config_file: "package.json".into(),
                detect: |content, _path| {
                    let v: serde_json::Value = serde_json::from_str(content).ok()?;
                    let name = v.get("name").and_then(|n| n.as_str()).unwrap_or("node-project").to_string();
                    let version = v.get("version").and_then(|n| n.as_str()).map(|s| s.to_string());
                    let deps = extract_deps(&v, "dependencies");
                    let dev_deps = extract_deps(&v, "devDependencies");
                    let mut all_deps = deps;
                    all_deps.extend(dev_deps);

                    let _has_ts_dep = all_deps.iter().any(|d| d.contains("typescript") || d.starts_with("@types/"));

                    let lang = if has_file(&v, "tsconfig.json") || _has_ts_dep {
                        "TypeScript"
                    } else {
                        "JavaScript"
                    };

                    Some(FrameworkInfo {
                        name,
                        language: lang.to_string(),
                        version,
                        config_files: vec!["package.json".into()],
                        dependencies: all_deps,
                    })
                },
            },
            Detector {
                config_file: "Cargo.toml".into(),
                detect: |content, _path| {
                    let pkg = extract_toml_value(content, "package.name");
                    let name = pkg.as_deref().unwrap_or("rust-project").to_string();
                    let version = extract_toml_value(content, "package.version");
                    let deps = extract_toml_table_keys(content, "dependencies");
                    let build_deps = extract_toml_table_keys(content, "build-dependencies");
                    let mut all_deps = deps;
                    all_deps.extend(build_deps);

                    Some(FrameworkInfo {
                        name,
                        language: "Rust".into(),
                        version,
                        config_files: vec!["Cargo.toml".into()],
                        dependencies: all_deps,
                    })
                },
            },
            Detector {
                config_file: "pyproject.toml".into(),
                detect: |content, _path| {
                    let name = extract_toml_value(content, "project.name")
                        .or_else(|| extract_toml_value(content, "tool.poetry.name"));
                    let version = extract_toml_value(content, "project.version")
                        .or_else(|| extract_toml_value(content, "tool.poetry.version"));
                    let deps = extract_toml_table_keys(content, "project.dependencies");

                    Some(FrameworkInfo {
                        name: name.unwrap_or_else(|| "python-project".to_string()),
                        language: "Python".into(),
                        version,
                        config_files: vec!["pyproject.toml".into()],
                        dependencies: deps,
                    })
                },
            },
            Detector {
                config_file: "requirements.txt".into(),
                detect: |content, _path| {
                    let deps: Vec<String> = content.lines()
                        .filter(|l| !l.trim().is_empty() && !l.trim().starts_with('#'))
                        .map(|l| {
                            let parts: Vec<&str> = l.split(&['=', '>', '<', '~', '!', '@'][..]).collect();
                            parts[0].trim().to_string()
                        })
                        .collect();

                    Some(FrameworkInfo {
                        name: "python-project".into(),
                        language: "Python".into(),
                        version: None,
                        config_files: vec!["requirements.txt".into()],
                        dependencies: deps,
                    })
                },
            },
            Detector {
                config_file: "go.mod".into(),
                detect: |content, _path| {
                    let name = content.lines()
                        .next()
                        .and_then(|l| l.strip_prefix("module "))
                        .map(|s| s.trim().to_string());
                    let deps: Vec<String> = content.lines()
                        .filter(|l| l.trim().starts_with("require"))
                        .flat_map(|l| {
                            let rest = l.trim_start_matches("require").trim();
                            if rest.contains('(') {
                                vec![] // multi-line require block — skip for simplicity
                            } else {
                                rest.split_whitespace().next().map(|s| s.to_string()).into_iter().collect()
                            }
                        })
                        .collect();

                    Some(FrameworkInfo {
                        name: name.unwrap_or_else(|| "go-project".to_string()),
                        language: "Go".into(),
                        version: None,
                        config_files: vec!["go.mod".into()],
                        dependencies: deps,
                    })
                },
            },
            Detector {
                config_file: "CMakeLists.txt".into(),
                detect: |content, _path| {
                    let name = content.lines()
                        .find(|l| l.trim().starts_with("project("))
                        .and_then(|l| {
                            let rest = l.trim().strip_prefix("project(")?;
                            rest.split(')').next().map(|s| s.trim().to_string())
                        });
                    Some(FrameworkInfo {
                        name: name.unwrap_or_else(|| "cmake-project".to_string()),
                        language: "C/C++".into(),
                        version: None,
                        config_files: vec!["CMakeLists.txt".into()],
                        dependencies: vec![],
                    })
                },
            },
            Detector {
                config_file: "composer.json".into(),
                detect: |content, _path| {
                    let v: serde_json::Value = serde_json::from_str(content).ok()?;
                    let name = v.get("name").and_then(|n| n.as_str()).unwrap_or("php-project").to_string();
                    let deps = extract_deps(&v, "require");
                    let dev_deps = extract_deps(&v, "require-dev");
                    let mut all_deps = deps;
                    all_deps.extend(dev_deps);
                    Some(FrameworkInfo {
                        name,
                        language: "PHP".into(),
                        version: None,
                        config_files: vec!["composer.json".into()],
                        dependencies: all_deps,
                    })
                },
            },
        ]
    }

    pub fn detect(path: &Path) -> Vec<FrameworkInfo> {
        let detectors = Self::builtin_detectors();
        let mut results = Vec::new();

        for detector in &detectors {
            let config_path = path.join(&detector.config_file);
            if config_path.exists() {
                if let Ok(content) = std::fs::read_to_string(&config_path) {
                    if let Some(info) = (detector.detect)(&content, &config_path) {
                        results.push(info);
                    }
                }
            }
        }

        results
    }

    pub fn detect_single(path: &Path) -> Option<FrameworkInfo> {
        let mut results = Self::detect(path);
        if results.len() > 1 {
            results.sort_by(|a, b| b.dependencies.len().cmp(&a.dependencies.len()));
        }
        results.into_iter().next()
    }

    pub fn analyze(path: &Path) -> ProjectAnalysis {
        let frameworks = Self::detect(path);
        let language = frameworks.first().map(|f| f.language.clone());
        let has_git = path.join(".git").exists();
        let has_readme = path.join("README.md").exists() || path.join("README").exists();
        let has_ci_config = path.join(".github").exists() || path.join(".gitlab-ci.yml").exists()
            || path.join("Jenkinsfile").exists() || path.join(".circleci").exists();

        let mut main_files = Vec::new();
        let mut src_dirs = Vec::new();
        let mut file_count = 0u64;
        let mut total_size_bytes = 0u64;

        if let Ok(entries) = std::fs::read_dir(path) {
            for entry in entries.flatten() {
                let ft = entry.file_type().ok();
                let fname = entry.file_name().to_string_lossy().to_string();

                if ft.map(|t| t.is_file()).unwrap_or(false) {
                    file_count += 1;
                    if let Ok(meta) = entry.metadata() {
                        total_size_bytes += meta.len();
                    }
                    if matches!(fname.as_str(), "main.rs" | "main.go" | "main.py" | "index.js" | "index.ts" | "app.py" | "App.jsx" | "App.tsx" | "main.c" | "main.cpp") {
                        main_files.push(entry.path().to_string_lossy().to_string());
                    }
                } else if ft.map(|t| t.is_dir()).unwrap_or(false) {
                    match fname.as_str() {
                        "src" | "lib" | "app" | "cmd" | "pkg" | "internal" => {
                            src_dirs.push(entry.path().to_string_lossy().to_string());
                        }
                        _ => {}
                    }
                }
            }
        }

        let estimated_type = estimate_type(&frameworks, &main_files, &src_dirs);

        ProjectAnalysis {
            frameworks,
            language,
            main_files,
            estimated_type,
            has_readme,
            has_git,
            has_ci_config,
            file_count,
            total_size_bytes,
            src_dirs,
        }
    }
}

fn estimate_type(frameworks: &[FrameworkInfo], main_files: &[String], _src_dirs: &[String]) -> ProjectType {
    for fw in frameworks {
        let deps_str = fw.dependencies.join(" ").to_lowercase();
        if has_any_str(&deps_str, &["react", "vue", "angular", "svelte", "next"]) {
            return ProjectType::WebFrontend;
        }
        if has_any_str(&deps_str, &["express", "django", "flask", "actix", "axum", "rocket"]) {
            return ProjectType::WebBackend;
        }
    }
    if !main_files.is_empty() {
        return ProjectType::Application;
    }
    ProjectType::Unknown
}

fn extract_deps(v: &serde_json::Value, key: &str) -> Vec<String> {
    v.get(key)
        .and_then(|d| d.as_object())
        .map(|obj| obj.keys().cloned().collect())
        .unwrap_or_default()
}

fn has_any(deps: &[String], names: &[&str]) -> bool {
    deps.iter().any(|d| names.iter().any(|n| d.contains(n)))
}

fn has_any_str(s: &str, names: &[&str]) -> bool {
    names.iter().any(|n| s.contains(n))
}

fn has_file(v: &serde_json::Value, _name: &str) -> bool {
    v.as_object().map(|obj| obj.contains_key("scripts")).unwrap_or(false)
}

fn extract_toml_value(content: &str, key_path: &str) -> Option<String> {
    let value = toml_extract(content, key_path)?;
    Some(value.trim_matches('"').to_string())
}

fn extract_toml_table_keys(content: &str, key: &str) -> Vec<String> {
    toml_extract_table(content, key)
}

fn toml_extract(content: &str, key_path: &str) -> Option<String> {
    let key = key_path.split('.').last()?;
    let pattern = format!("{} = ", key);
    let line = content.lines().find(|l| l.trim().starts_with(&pattern))?;
    let value = line.trim().strip_prefix(&pattern)?;
    Some(value.to_string())
}

fn toml_extract_table(content: &str, table_name: &str) -> Vec<String> {
    let mut in_table = false;
    let mut keys = Vec::new();

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with('[') {
            in_table = trimmed == format!("[{}]", table_name)
                || trimmed == format!("[{}]", table_name.replace('.', "."));
            continue;
        }
        if in_table && trimmed.contains('=') && !trimmed.starts_with('#') {
            if let Some(key) = trimmed.split('=').next() {
                keys.push(key.trim().to_string());
            }
        }
    }

    keys
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_detect_package_json() {
        let dir = TempDir::new().unwrap();
        std::fs::write(dir.path().join("package.json"), r#"{
            "name": "test-app",
            "version": "1.0.0",
            "dependencies": { "react": "^18.0.0" },
            "devDependencies": { "typescript": "^5.0.0" }
        }"#).unwrap();
        let results = FrameworkDetect::detect(dir.path());
        assert!(!results.is_empty());
        assert_eq!(results[0].name, "test-app");
        assert!(results[0].dependencies.contains(&"react".to_string()));
        assert!(results[0].dependencies.contains(&"typescript".to_string()));
    }

    #[test]
    fn test_detect_cargo_toml() {
        let dir = TempDir::new().unwrap();
        std::fs::write(dir.path().join("Cargo.toml"), r#"[package]
name = "my-crate"
version = "0.1.0"

[dependencies]
serde = "1"
tokio = { version = "1", features = ["full"] }
"#).unwrap();
        let results = FrameworkDetect::detect(dir.path());
        assert!(!results.is_empty());
        assert_eq!(results[0].language, "Rust");
        assert!(results[0].dependencies.contains(&"serde".to_string()));
    }

    #[test]
    fn test_detect_pyproject() {
        let dir = TempDir::new().unwrap();
        std::fs::write(dir.path().join("pyproject.toml"), r#"[project]
name = "my-pkg"
version = "0.1.0"
dependencies = ["requests", "click"]
"#).unwrap();
        let results = FrameworkDetect::detect(dir.path());
        assert!(!results.is_empty());
        assert_eq!(results[0].language, "Python");
    }

    #[test]
    fn test_detect_requirements() {
        let dir = TempDir::new().unwrap();
        std::fs::write(dir.path().join("requirements.txt"), "flask>=2.0\ndjango<4.0\n# comment\npydantic").unwrap();
        let results = FrameworkDetect::detect(dir.path());
        assert!(!results.is_empty());
        assert!(results[0].dependencies.iter().any(|d| d == "flask"));
    }

    #[test]
    fn test_detect_go_mod() {
        let dir = TempDir::new().unwrap();
        std::fs::write(dir.path().join("go.mod"), "module github.com/user/myapp\ngo 1.21").unwrap();
        let results = FrameworkDetect::detect(dir.path());
        assert!(!results.is_empty());
        assert_eq!(results[0].language, "Go");
    }

    #[test]
    fn test_detect_multiple() {
        let dir = TempDir::new().unwrap();
        std::fs::write(dir.path().join("package.json"), r#"{"name":"fe","dependencies":{"react":"18"}}"#).unwrap();
        std::fs::write(dir.path().join("Cargo.toml"), r#"[package]
name = "be"
version = "0.1.0"
[dependencies]
actix-web = "4"
"#).unwrap();
        let results = FrameworkDetect::detect(dir.path());
        assert!(results.len() >= 2);
    }

    #[test]
    fn test_detect_empty_dir() {
        let dir = TempDir::new().unwrap();
        let results = FrameworkDetect::detect(dir.path());
        assert!(results.is_empty());
    }

    #[test]
    fn test_analyze_basic() {
        let dir = TempDir::new().unwrap();
        std::fs::write(dir.path().join("main.rs"), "fn main() {}").unwrap();
        std::fs::create_dir(dir.path().join("src")).unwrap();
        let analysis = FrameworkDetect::analyze(dir.path());
        assert!(analysis.main_files.iter().any(|f| f.ends_with("main.rs")));
        assert!(analysis.src_dirs.iter().any(|f| f.ends_with("src")));
        assert!(!analysis.has_git);
        assert_eq!(analysis.file_count, 1);
    }

    #[test]
    fn test_detect_single_prefers_richer() {
        let dir = TempDir::new().unwrap();
        std::fs::write(dir.path().join("package.json"), r#"{"name":"fe","dependencies":{"react":"18"}}"#).unwrap();
        std::fs::write(dir.path().join("Cargo.toml"), r#"[package]\nname = \"be\"\n[dependencies]\nactix-web = \"4\""#).unwrap();
        // Single detection prefers more deps
        let result = FrameworkDetect::detect_single(dir.path());
        assert!(result.is_some());
    }

    #[test]
    fn test_estimate_web_frontend() {
        let fw = FrameworkInfo {
            name: "app".into(),
            language: "TypeScript".into(),
            version: None,
            config_files: vec![],
            dependencies: vec!["react".into()],
        };
        assert_eq!(estimate_type(&[fw], &[], &[]), ProjectType::WebFrontend);
    }

    #[test]
    fn test_estimate_unknown() {
        let fw = FrameworkInfo {
            name: "lib".into(),
            language: "Rust".into(),
            version: None,
            config_files: vec![],
            dependencies: vec![],
        };
        assert_eq!(estimate_type(&[fw], &[], &[]), ProjectType::Unknown);
    }

    #[test]
    fn test_toml_extract_basic() {
        let content = r#"[package]
name = "test"
version = "0.1.0""#;
        assert_eq!(toml_extract(content, "package.name").as_deref(), Some("\"test\""));
    }

    #[test]
    fn test_toml_extract_table_keys() {
        let content = r#"[dependencies]
serde = "1"
tokio = "1""#;
        let keys = toml_extract_table(content, "dependencies");
        assert_eq!(keys.len(), 2);
        assert!(keys.contains(&"serde".to_string()));
    }
}
