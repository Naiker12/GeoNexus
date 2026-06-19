use std::path::Path;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TemplateFile {
    pub path: String,
    pub content: String,
    pub is_executable: bool,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Template {
    pub name: String,
    pub label: String,
    pub description: String,
    pub language: String,
    pub files: Vec<TemplateFile>,
    pub post_create_msg: Option<String>,
}

pub struct TemplateFactory;

impl TemplateFactory {
    pub fn list_all() -> Vec<Template> {
        vec![
            Self::rust_lib_template(),
            Self::rust_binary_template(),
            Self::node_ts_template(),
            Self::node_js_template(),
            Self::python_script_template(),
            Self::python_package_template(),
            Self::go_cli_template(),
            Self::c_cmake_template(),
        ]
    }

    pub fn find(name: &str) -> Option<Template> {
        Self::list_all().into_iter().find(|t| t.name == name)
    }

    pub fn create(template: &Template, dest: &Path) -> Result<Vec<std::path::PathBuf>, String> {
        let mut created = Vec::new();

        for file in &template.files {
            let expanded_path = expand_variables(&file.path, template);
            let file_path = dest.join(&expanded_path);
            if let Some(parent) = file_path.parent() {
                std::fs::create_dir_all(parent).map_err(|e| format!("failed to create dir {}: {}", parent.display(), e))?;
            }

            let expanded = expand_variables(&file.content, template);
            std::fs::write(&file_path, &expanded).map_err(|e| format!("failed to write {}: {}", file_path.display(), e))?;

            if file.is_executable {
                #[cfg(unix)]
                {
                    use std::os::unix::fs::PermissionsExt;
                    std::fs::set_permissions(&file_path, std::fs::Permissions::from_mode(0o755)).ok();
                }
            }

            created.push(file_path);
        }

        if let Some(msg) = &template.post_create_msg {
            tracing::info!("{}", msg);
        }

        Ok(created)
    }

    fn rust_lib_template() -> Template {
        Template {
            name: "rust-lib".into(),
            label: "Rust Library".into(),
            description: "A Rust library crate with Cargo.toml and lib.rs".into(),
            language: "Rust".into(),
            files: vec![
                TemplateFile {
                    path: "Cargo.toml".into(),
                    content: r#"[package]
name = "{{name}}"
version = "0.1.0"
edition = "2021"

[dependencies]
"#.into(),
                    is_executable: false,
                },
                TemplateFile {
                    path: "src/lib.rs".into(),
                    content: "pub fn hello() -> &'static str {\n    \"Hello, world!\"\n}\n\n#[cfg(test)]\nmod tests {\n    use super::*;\n\n    #[test]\n    fn test_hello() {\n        assert_eq!(hello(), \"Hello, world!\");\n    }\n}\n".into(),
                    is_executable: false,
                },
            ],
            post_create_msg: Some("Rust library created. Run `cargo test` to verify.".into()),
        }
    }

    fn rust_binary_template() -> Template {
        Template {
            name: "rust-bin".into(),
            label: "Rust Binary".into(),
            description: "A Rust binary crate with Cargo.toml and main.rs".into(),
            language: "Rust".into(),
            files: vec![
                TemplateFile {
                    path: "Cargo.toml".into(),
                    content: r#"[package]
name = "{{name}}"
version = "0.1.0"
edition = "2021"

[dependencies]
"#.into(),
                    is_executable: false,
                },
                TemplateFile {
                    path: "src/main.rs".into(),
                    content: "fn main() {\n    println!(\"Hello, world!\");\n}\n".into(),
                    is_executable: false,
                },
            ],
            post_create_msg: Some("Rust binary created. Run `cargo run` to execute.".into()),
        }
    }

    fn node_ts_template() -> Template {
        Template {
            name: "node-ts".into(),
            label: "Node.js TypeScript".into(),
            description: "A Node.js project with TypeScript, tsconfig.json, and src/".into(),
            language: "TypeScript".into(),
            files: vec![
                TemplateFile {
                    path: "package.json".into(),
                    content: r#"{
  "name": "{{name}}",
  "version": "1.0.0",
  "description": "",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts"
  },
  "dependencies": {},
  "devDependencies": {
    "typescript": "^5.0.0",
    "ts-node": "^10.9.0",
    "@types/node": "^20.0.0"
  }
}
"#.into(),
                    is_executable: false,
                },
                TemplateFile {
                    path: "tsconfig.json".into(),
                    content: r#"{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
"#.into(),
                    is_executable: false,
                },
                TemplateFile {
                    path: "src/index.ts".into(),
                    content: "export function greet(name: string): string {\n    return `Hello, ${name}!`;\n}\n\nconsole.log(greet(\"world\"));\n".into(),
                    is_executable: false,
                },
            ],
            post_create_msg: Some("TypeScript project created. Run `npm install && npm run build` to start.".into()),
        }
    }

    fn node_js_template() -> Template {
        Template {
            name: "node-js".into(),
            label: "Node.js JavaScript".into(),
            description: "A Node.js project with package.json and src/".into(),
            language: "JavaScript".into(),
            files: vec![
                TemplateFile {
                    path: "package.json".into(),
                    content: r#"{
  "name": "{{name}}",
  "version": "1.0.0",
  "description": "",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "test": "node --test src/**/*.test.js"
  },
  "dependencies": {},
  "devDependencies": {}
}
"#.into(),
                    is_executable: false,
                },
                TemplateFile {
                    path: "src/index.js".into(),
                    content: "function greet(name) {\n    return `Hello, ${name}!`;\n}\n\nconsole.log(greet(\"world\"));\n\nmodule.exports = { greet };\n".into(),
                    is_executable: false,
                },
            ],
            post_create_msg: Some("Node.js project created. Run `npm start` to run.".into()),
        }
    }

    fn python_script_template() -> Template {
        Template {
            name: "python-script".into(),
            label: "Python Script".into(),
            description: "A single Python script with entry point".into(),
            language: "Python".into(),
            files: vec![
                TemplateFile {
                    path: "main.py".into(),
                    content: r#"""{{name}} - Entry point."""


def main() -> None:
    print("Hello, world!")


if __name__ == "__main__":
    main()
"#.into(),
                    is_executable: true,
                },
            ],
            post_create_msg: Some("Python script created. Run `python main.py` to execute.".into()),
        }
    }

    fn python_package_template() -> Template {
        Template {
            name: "python-pkg".into(),
            label: "Python Package".into(),
            description: "A Python package with pyproject.toml and src/ layout".into(),
            language: "Python".into(),
            files: vec![
                TemplateFile {
                    path: "pyproject.toml".into(),
                    content: r#"[build-system]
requires = ["setuptools>=68.0"]
build-backend = "setuptools.backends._legacy:_Backend"

[project]
name = "{{name}}"
version = "0.1.0"
description = ""
requires-python = ">=3.10"

[project.scripts]
{{name}} = "{{name}}.__main__:main"
"#.into(),
                    is_executable: false,
                },
                TemplateFile {
                    path: format!("src/{}/__init__.py", "{{name}}"),
                    content: r#"""{{name}} package."""

__version__ = "0.1.0"
"#.into(),
                    is_executable: false,
                },
                TemplateFile {
                    path: format!("src/{}/__main__.py", "{{name}}"),
                    content: r#"""{{name}} entry point."""


def main() -> None:
    print("Hello, world!")


if __name__ == "__main__":
    main()
"#.into(),
                    is_executable: false,
                },
            ],
            post_create_msg: Some("Python package created. Install with `pip install -e .`".into()),
        }
    }

    fn go_cli_template() -> Template {
        Template {
            name: "go-cli".into(),
            label: "Go CLI".into(),
            description: "A Go command-line application with go.mod".into(),
            language: "Go".into(),
            files: vec![
                TemplateFile {
                    path: "go.mod".into(),
                    content: "module {{name}}\n\ngo 1.21\n".into(),
                    is_executable: false,
                },
                TemplateFile {
                    path: "main.go".into(),
                    content: r#"package main

import (
    "fmt"
    "os"
)

func main() {
    if len(os.Args) > 1 {
        fmt.Printf("Hello, %s!\n", os.Args[1])
    } else {
        fmt.Println("Hello, world!")
    }
}
"#.into(),
                    is_executable: false,
                },
            ],
            post_create_msg: Some("Go CLI created. Run `go run .` to execute.".into()),
        }
    }

    fn c_cmake_template() -> Template {
        Template {
            name: "c-cmake".into(),
            label: "C with CMake".into(),
            description: "A C project with CMakeLists.txt and src/".into(),
            language: "C".into(),
            files: vec![
                TemplateFile {
                    path: "CMakeLists.txt".into(),
                    content: r#"cmake_minimum_required(VERSION 3.16)
project({{name}} C)

set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)

add_executable({{name}} src/main.c)
"#.into(),
                    is_executable: false,
                },
                TemplateFile {
                    path: "src/main.c".into(),
                    content: r#"#include <stdio.h>

int main(void) {
    printf("Hello, world!\n");
    return 0;
}
"#.into(),
                    is_executable: false,
                },
            ],
            post_create_msg: Some("C project created. Build with `cmake -B build && cmake --build build`.".into()),
        }
    }
}

fn expand_variables(template: &str, _tpl: &Template) -> String {
    // Replace {{name}} with the template name
    template.replace("{{name}}", &_tpl.name)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_list_all() {
        let templates = TemplateFactory::list_all();
        assert!(!templates.is_empty());
        assert!(templates.iter().any(|t| t.name == "rust-bin"));
    }

    #[test]
    fn test_find_known() {
        let t = TemplateFactory::find("rust-lib");
        assert!(t.is_some());
        assert_eq!(t.unwrap().language, "Rust");
    }

    #[test]
    fn test_find_unknown() {
        assert!(TemplateFactory::find("nonexistent").is_none());
    }

    #[test]
    fn test_create_rust_bin() {
        let dir = TempDir::new().unwrap();
        let t = TemplateFactory::find("rust-bin").unwrap();
        let created = TemplateFactory::create(&t, dir.path()).unwrap();
        assert!(!created.is_empty());
        assert!(dir.path().join("Cargo.toml").exists());
        assert!(dir.path().join("src/main.rs").exists());
    }

    #[test]
    fn test_create_node_ts() {
        let dir = TempDir::new().unwrap();
        let t = TemplateFactory::find("node-ts").unwrap();
        let created = TemplateFactory::create(&t, dir.path()).unwrap();
        assert!(!created.is_empty());
        assert!(dir.path().join("package.json").exists());
        assert!(dir.path().join("tsconfig.json").exists());
        assert!(dir.path().join("src/index.ts").exists());
    }

    #[test]
    fn test_create_python_pkg_includes_name_in_path() {
        let dir = TempDir::new().unwrap();
        let mut t = TemplateFactory::find("python-pkg").unwrap();
        t.name = "mycli".into();
        let _ = TemplateFactory::create(&t, dir.path()).unwrap();
        assert!(dir.path().join("src/mycli/__init__.py").exists());
    }

    #[test]
    fn test_create_go_cli() {
        let dir = TempDir::new().unwrap();
        let t = TemplateFactory::find("go-cli").unwrap();
        let _created = TemplateFactory::create(&t, dir.path()).unwrap();
        assert!(dir.path().join("go.mod").exists());
        assert!(dir.path().join("main.go").exists());
    }
}
