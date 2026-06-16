//! Coding Agent - Genera código y proyectos usando reglas de Ponytail
//!
//! El Coding Agent se encarga de generar código de manera eficiente y minimalista,
//! siguiendo las reglas de Ponytail para reducir la cantidad de código generado
//! y priorizar soluciones simples.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Tipo de agente para la generación de código
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CodingAgentType {
    /// Agente para React + TypeScript
    ReactTs,
    /// Agente para Rust
    Rust,
    /// Agente para Python
    Python,
}

/// Tarea de generación de código
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodeGenerationTask {
    /// ID único de la tarea
    pub id: String,
    /// Tipo de agente a usar
    pub agent_type: CodingAgentType,
    /// Descripción de lo que hay que generar
    pub description: String,
    /// Ruta del proyecto
    pub project_path: String,
    /// Dependencias a instalar
    pub dependencies: Vec<String>,
    /// Estado de la tarea
    pub status: TaskStatus,
}

/// Estado de una tarea de generación de código
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum TaskStatus {
    /// Pendiente de ejecución
    Pending,
    /// En ejecución
    Running,
    /// Completada con éxito
    Completed,
    /// Error durante la ejecución
    Error,
}

/// Resultado de la generación de un archivo
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedFile {
    /// Ruta del archivo
    pub path: String,
    /// Contenido del archivo
    pub content: String,
    /// Tipo de archivo
    pub file_type: String,
    /// Estado de generación
    pub status: FileStatus,
}

/// Estado de un archivo generado
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum FileStatus {
    /// Pendiente de generar
    Pending,
    /// Generándose
    Generating,
    /// Generado con éxito
    Generated,
    /// Error al generar
    Error,
}

/// Prompt principal del Coding Agent con reglas de Ponytail
pub const PONYTAIL_PROMPT: &str = r#"
# GeoNexus Coding Agent - Reglas de Ponytail

## Reglas Fundamentales

1. **No escribas código que ya exista** - Revisa primero el proyecto actual antes de crear nada nuevo
2. **No instales dependencias innecesarias** - Usa lo que ya está disponible o soluciones simples
3. **Mantén los componentes pequeños** - < 150 líneas, una sola responsabilidad
4. **Prioriza soluciones nativas** - Preferir APIs del navegador, Node.js o Rust estándar
5. **No crees abstracciones prematuras** - Si se usa menos de 3 veces, no abstraigas
6. **TypeScript estricto** - No usar any, no @ts-ignore
7. **Usa Tailwind CSS** - No crear archivos CSS personalizados a menos que sea estrictamente necesario

## Proceso de Generación

Antes de generar cualquier cosa:
1. Lista lo que ya existe en el proyecto
2. Identifica si hay soluciones reutilizables
3. Valida si la dependencia es necesaria
4. Genera solo lo mínimo indispensable

## Estructura de Proyecto (React + TS)

src/
  components/    # Componentes React pequeños (<150 líneas)
  pages/         # Páginas de la aplicación
  hooks/         # Custom hooks
  utils/         # Funciones utilitarias simples
  types/         # Definiciones de TypeScript
"#;

/// Sistema de archivos virtual para el Workspace
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VirtualFileSystem {
    /// Archivos del sistema
    pub files: HashMap<String, GeneratedFile>,
    /// Carpetas
    pub folders: HashMap<String, Vec<String>>,
}

impl VirtualFileSystem {
    /// Crea un nuevo sistema de archivos virtual
    pub fn new() -> Self {
        Self {
            files: HashMap::new(),
            folders: HashMap::new(),
        }
    }

    /// Añade un archivo al sistema
    pub fn add_file(&mut self, path: String, content: String, file_type: String) {
        let file = GeneratedFile {
            path: path.clone(),
            content,
            file_type,
            status: FileStatus::Generated,
        };
        self.files.insert(path.clone(), file);

        // Añade a las carpetas
        if let Some(parent) = path.rfind('/') {
            let folder = path[0..parent].to_string();
            let filename = path[parent+1..].to_string();
            self.folders.entry(folder).or_default().push(filename);
        }
    }

    /// Obtiene un archivo por su ruta
    pub fn get_file(&self, path: &str) -> Option<&GeneratedFile> {
        self.files.get(path)
    }
}

impl Default for VirtualFileSystem {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_virtual_fs() {
        let mut fs = VirtualFileSystem::new();
        fs.add_file(
            "src/components/Test.tsx".to_string(),
            "export const Test = () => <div>Test</div>;".to_string(),
            "tsx".to_string(),
        );
        
        let file = fs.get_file("src/components/Test.tsx");
        assert!(file.is_some());
        assert_eq!(file.unwrap().status, FileStatus::Generated);
    }
}
