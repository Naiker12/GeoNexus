# FILESYSTEM MCP — ARQUITECTURA DEFINITIVA
**GeoNexus / Geo Agents V2**
**Versión:** 1.0
**Fecha:** 19 Junio 2026
**Encaja con:** Event Bus, Worker Pool, Artifact System, Reasoning Timeline (ver `GEONEXUS_V3_MASTER_PLAN.md`)

---

## ÍNDICE

1. [Objetivo y filosofía](#1-objetivo-y-filosofía)
2. [Arquitectura general](#2-arquitectura-general)
3. [Estructura de Workspace](#3-estructura-de-workspace)
4. [Configuración y onboarding (Wizard)](#4-configuración-y-onboarding-wizard)
5. [Modelo de seguridad](#5-modelo-de-seguridad)
6. [Patrones de diseño aplicados](#6-patrones-de-diseño-aplicados)
7. [Capa Rust: estructura de crates](#7-capa-rust-estructura-de-crates)
8. [Herramientas MCP (Tool Specs)](#8-herramientas-mcp-tool-specs)
9. [Indexación y búsqueda](#9-indexación-y-búsqueda)
10. [Integración con Event Bus](#10-integración-con-event-bus)
11. [Integración con Worker Pool / Coding Agent](#11-integración-con-worker-pool--coding-agent)
12. [UI: Reasoning Timeline con shadcn/ui + Magic UI + Motion](#12-ui-reasoning-timeline-con-shadcnui--magic-ui--motion)
13. [UI: Wizard de permisos y diálogos de confirmación](#13-ui-wizard-de-permisos-y-diálogos-de-confirmación)
14. [Base de datos: tablas nuevas](#14-base-de-datos-tablas-nuevas)
15. [Checklist de seguridad (no negociable)](#15-checklist-de-seguridad-no-negociable)
16. [Roadmap de implementación](#16-roadmap-de-implementación)
17. [Estructura final de archivos](#17-estructura-final-de-archivos)

---

## 1. OBJETIVO Y FILOSOFÍA

El Filesystem MCP **no da acceso al computador**. Da acceso a **Workspaces autorizados explícitamente por el usuario**, con permisos graduales y trazabilidad total.

> **Regla de oro:** si una ruta no está dentro de `allowedPaths`, el MCP la trata como si no existiera. No hay "modo admin que se salta esto". No hay excepciones por comodidad.

Principios de diseño:

- **Least privilege por defecto** — todo arranca en `READ_ONLY`.
- **Allowlist explícita, nunca denylist** — se autoriza por inclusión, no se bloquea por exclusión.
- **Confirmación humana para toda operación destructiva o de ejecución.**
- **Cero acceso implícito** — el MCP no se activa solo; se invoca con `@filesystem`.
- **Todo es auditable** — cada operación pasa por el Event Bus y queda en SQLite.
- **El agente nunca ve la ruta absoluta del usuario en texto libre sin pasar por el validador de paths.**

---

## 2. ARQUITECTURA GENERAL

```
┌──────────────────────────────────────────────────────────────────┐
│                          USUARIO                                  │
│              "@filesystem crea un proyecto FastAPI"               │
└───────────────────────────────┬────────────────────────────────────┘
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│  PLANNER WORKER                                                   │
│  - Detecta mención @filesystem                                   │
│  - Extrae intención (search / read / write / create / analyze)   │
└───────────────────────────────┬────────────────────────────────────┘
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│  FILESYSTEM MCP ROUTER                                            │
│  - Mapea intención → tool MCP concreta                           │
│  - Adjunta session_id + permisos actuales                         │
└───────────────────────────────┬────────────────────────────────────┘
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│  PERMISSION LAYER (Chain of Responsibility)                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │
│  │ PathGuard  │→ │ LevelGuard │→ │ RateGuard  │→ │ ConfirmGate│  │
│  │ (allowlist)│  │ (R/W/X/A)  │  │ (flood)    │  │ (destruct.)│  │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘  │
└───────────────────────────────┬────────────────────────────────────┘
                                 ▼ (si pasa todas las puertas)
┌──────────────────────────────────────────────────────────────────┐
│  FILESYSTEM MCP CORE (Rust, crate geonexus-fs-mcp)                │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐     │
│  │ Discovery  │ │  IO Ops    │ │  Analyzer  │ │  Indexer   │     │
│  │ (search,   │ │ (read,     │ │ (detect    │ │ (FTS5 +    │     │
│  │  list)     │ │  create,   │ │  framework)│ │  embeds)   │     │
│  │            │ │  update,   │ │            │ │            │     │
│  │            │ │  delete)   │ │            │ │            │     │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘     │
└───────────────────────────────┬────────────────────────────────────┘
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│  EVENT BUS (geonexus-core::events)                                 │
│  emit: file_found | file_read | folder_created | file_deleted ... │
└───────────────────────────────┬────────────────────────────────────┘
                       ┌─────────┴─────────┐
                       ▼                   ▼
        ┌────────────────────────┐  ┌────────────────────────┐
        │  REASONING TIMELINE    │  │  ARTIFACT SYSTEM        │
        │  (frontend, en vivo)   │  │  (proyectos/archivos    │
        │                        │  │   generados)            │
        └────────────────────────┘  └────────────────────────┘
```

---

## 3. ESTRUCTURA DE WORKSPACE

GeoNexus nunca opera sobre rutas arbitrarias del sistema. Opera sobre **Workspaces**: carpetas que el usuario autoriza explícitamente.

```
<allowedPath raíz, ej. D:/Proyectos>/
├── .geonexus/                  # metadata interna, NO se muestra al LLM como contenido
│   ├── index.db                # índice FTS5 + embeddings de este workspace
│   └── workspace.json          # framework detectado, last_scan, hash tree
├── <proyecto-1>/
├── <proyecto-2>/
└── ...
```

Carpetas sugeridas por defecto durante el wizard (el usuario puede aceptarlas o ignorarlas, **nunca se crean sin confirmación**):

```
GeoAgents/
├── Projects/     → proyectos de código creados por el Coding Worker
├── Documents/    → PDFs, reportes, documentos de trabajo
├── GIS/          → shapefiles, geojson, rasters
├── Downloads/    → archivos descargados desde conectores (OneDrive, etc.)
├── Temp/         → resultados intermedios, se purga periódicamente
└── Cache/        → cache de indexación, nunca se le muestra al LLM
```

> `Temp/` y `Cache/` están marcadas como `system_managed = true`: el usuario puede leerlas, pero el agente no las usa como fuente de "memoria" persistente — son efímeras y se limpian por TTL.

---

## 4. CONFIGURACIÓN Y ONBOARDING (WIZARD)

El Filesystem MCP **no se activa solo**. Solo se monta cuando el usuario escribe `@filesystem` por primera vez en una sesión, y solo se materializa tras el wizard.

### 4.1 Flujo de primer uso

```
Usuario escribe "@filesystem ..." por primera vez
        ▼
¿Existe filesystem.config.json? ──NO──▶ Mostrar FilesystemSetupWizard
        │ SÍ                                      │
        ▼                                          ▼
Cargar allowedPaths                    Usuario selecciona carpetas
        │                                          │
        ▼                                          ▼
Continuar con la tool solicitada       Guardar config + crear índice inicial
```

### 4.2 `filesystem.config.json`

```jsonc
{
  "version": 1,
  "allowedPaths": [
    {
      "path": "D:/Proyectos",
      "level": "write",          // read | write | execute | admin
      "addedAt": "2026-06-19T10:00:00Z",
      "label": "Proyectos"
    },
    {
      "path": "D:/GIS",
      "level": "read",
      "addedAt": "2026-06-19T10:00:00Z",
      "label": "GIS"
    }
  ],
  "globalDefaults": {
    "level": "read",            // toda carpeta nueva entra como read-only
    "requireConfirmFor": ["delete", "move", "execute", "overwrite"],
    "maxFileSizeMb": 25,
    "deniedExtensions": [".exe", ".dll", ".sh", ".bat", ".ps1", ".so"]
  },
  "indexing": {
    "enabled": true,
    "excludeDirs": ["node_modules", ".git", "dist", "build", "__pycache__", ".venv"]
  }
}
```

Este archivo vive en `~/.geonexus/filesystem.config.json` (NO dentro de un workspace, para que el propio archivo de configuración nunca sea editable por el agente).

---

## 5. MODELO DE SEGURIDAD

### 5.1 Niveles de permiso (jerárquicos)

| Nivel | Puede | No puede |
|---|---|---|
| `READ` (default) | listar, buscar, leer contenido | escribir nada |
| `WRITE` | + crear archivos/carpetas, modificar | borrar, ejecutar |
| `EXECUTE` | + `npm install`, `pip install`, `git clone` (allowlist de binarios) | borrar masivo, mover fuera del workspace |
| `ADMIN` | + eliminar, mover, operaciones masivas | salir de `allowedPaths` (esto NUNCA es posible, en ningún nivel) |

Cada nivel es **estrictamente superset** del anterior. No hay permisos "cruzados" (ej. EXECUTE sin WRITE no tiene sentido y no se permite).

### 5.2 Validación de paths — algoritmo (no negociable)

```rust
// crates/geonexus-fs-mcp/src/security/path_guard.rs

use std::path::{Path, PathBuf};

#[derive(Debug, thiserror::Error)]
pub enum PathGuardError {
    #[error("path outside any allowed workspace")]
    OutsideAllowlist,
    #[error("path traversal detected")]
    TraversalAttempt,
    #[error("symlink escapes allowed workspace")]
    SymlinkEscape,
    #[error("denied extension: {0}")]
    DeniedExtension(String),
}

pub struct PathGuard {
    allowed_roots: Vec<PathBuf>, // ya canonicalizados al cargar config
    denied_extensions: Vec<String>,
}

impl PathGuard {
    /// Resuelve la ruta solicitada contra los roots permitidos.
    /// Reglas aplicadas EN ORDEN, todas obligatorias:
    pub fn validate(&self, requested: &Path) -> Result<PathBuf, PathGuardError> {
        // 1. Canonicalizar (resuelve "..", symlinks, "." )
        let canonical = requested
            .canonicalize()
            .map_err(|_| PathGuardError::OutsideAllowlist)?;

        // 2. Verificar que el canonical resultante sigue dentro
        //    de ALGUNO de los roots permitidos (canonicalizados también).
        //    Esto es lo único que neutraliza symlinks y "..".
        let is_inside = self.allowed_roots.iter().any(|root| canonical.starts_with(root));
        if !is_inside {
            return Err(PathGuardError::OutsideAllowlist);
        }

        // 3. Re-chequeo anti symlink-escape: si el archivo es un symlink,
        //    su destino real (ya cubierto por canonicalize) debe seguir
        //    dentro del root. canonicalize() ya lo resuelve, pero
        //    validamos explícitamente para loguear el intento.
        if requested.is_symlink() && !canonical.starts_with(self.matching_root(&canonical)?) {
            return Err(PathGuardError::SymlinkEscape);
        }

        // 4. Extensión denegada (ejecutables, scripts) — incluso en READ.
        if let Some(ext) = canonical.extension().and_then(|e| e.to_str()) {
            let ext_lower = format!(".{}", ext.to_lowercase());
            if self.denied_extensions.contains(&ext_lower) {
                return Err(PathGuardError::DeniedExtension(ext_lower));
            }
        }

        Ok(canonical)
    }
}
```

**Por qué esto y no un simple `starts_with` sobre el string crudo:** comparar strings sin `canonicalize()` es la causa #1 de bypass de sandboxing (`D:/Proyectos/../../Windows` pasa un `starts_with` naive pero no debe pasar nunca). Cada operación del MCP — sin excepción — pasa por `PathGuard::validate()` antes de tocar disco.

### 5.3 Confirmaciones obligatorias

Estas acciones **nunca se ejecutan sin un diálogo de confirmación explícito del usuario**, sin importar el nivel de permiso otorgado:

- `deleteFile` / `deleteFolder`
- `moveFile` (fuera de la carpeta actual)
- `overwriteFile` (si el archivo ya existe y tiene contenido distinto)
- cualquier `executeCommand` (`npm install`, `pip install`, `git clone`)
- operaciones que afecten más de 1 archivo a la vez (operación masiva)

La UI de este diálogo se especifica en la [sección 13](#13-ui-wizard-de-permisos-y-diálogos-de-confirmación).

### 5.4 Otras reglas duras

- Tamaño máximo de archivo leído: configurable, default 25MB (evita exfiltración accidental de binarios enormes al contexto del LLM).
- Extensiones denegadas siempre, incluso en modo ADMIN: `.exe .dll .so .sh .bat .ps1 .app`.
- El MCP nunca persiste credenciales, tokens, ni contenido de `.env` en el índice ni en logs (filtrado por nombre de archivo: `.env*`, `*secret*`, `*credentials*` se excluyen del indexado y del contenido devuelto al LLM por defecto, requieren confirmación explícita para leerse).
- Rate limiting: máximo N operaciones de escritura por minuto por sesión (token bucket), para frenar loops descontrolados del agente.

---

## 6. PATRONES DE DISEÑO APLICADOS

| Patrón | Dónde se usa | Por qué |
|---|---|---|
| **Chain of Responsibility** | `PathGuard → LevelGuard → RateGuard → ConfirmGate` | Cada guard puede rechazar independientemente; agregar un nuevo guard no toca los demás |
| **Strategy** | `Indexer` (FTS5 vs embeddings vs metadata ranking) son estrategias intercambiables combinadas en `HybridSearchStrategy` | Permite swap de motor de búsqueda sin tocar el caller |
| **Command** | Cada tool MCP (`createFile`, `deleteFile`, etc.) se modela como un `Command` con `execute()` y `describe()` | Permite logging uniforme, undo futuro, y serialización para el Event Bus |
| **Repository** | `FilesystemIndexRepo` abstrae el acceso a `index.db` (SQLite FTS5) | El resto del sistema no sabe que es SQLite, podría migrar a Tantivy sin romper nada |
| **Observer / Event Bus** | Cada operación emite un `GeoEvent` consumido por Timeline y Artifacts | Desacopla "qué pasó" de "quién lo muestra" |
| **Factory** | `ProjectTemplateFactory::create(framework)` para `createProject()` | Centraliza la creación de boilerplate por framework sin `if/else` gigante |
| **Façade** | `FilesystemMcpFacade` expone una API simple al Router; internamente coordina Discovery/IO/Analyzer/Indexer | El Router no necesita conocer la complejidad interna |
| **Decorator** | `AuditedOperation<T>` envuelve cualquier Command para loguear input/output sin modificar el Command original | Auditoría transversal sin ensuciar cada implementación |

---

## 7. CAPA RUST: ESTRUCTURA DE CRATES

Nuevo crate dedicado, separado de `geonexus-mcp` genérico (porque este MCP tiene reglas de seguridad propias y mucho más superficie):

```
crates/geonexus-fs-mcp/
├── Cargo.toml
└── src/
    ├── lib.rs
    ├── config.rs              # filesystem.config.json (load/save/validate)
    ├── security/
    │   ├── mod.rs
    │   ├── path_guard.rs       # ver sección 5.2
    │   ├── level_guard.rs      # READ/WRITE/EXECUTE/ADMIN check
    │   ├── rate_guard.rs       # token bucket por sesión
    │   └── confirm_gate.rs     # marca operaciones que requieren confirm UI
    ├── commands/               # patrón Command
    │   ├── mod.rs
    │   ├── list_directories.rs
    │   ├── list_files.rs
    │   ├── search_files.rs
    │   ├── read_file.rs
    │   ├── create_folder.rs
    │   ├── create_file.rs
    │   ├── update_file.rs
    │   ├── delete_file.rs
    │   ├── move_file.rs
    │   ├── copy_file.rs
    │   ├── analyze_project.rs
    │   ├── detect_framework.rs
    │   └── create_project.rs
    ├── analyzer/
    │   ├── mod.rs
    │   ├── framework_detect.rs # heurísticas: package.json, requirements.txt, etc.
    │   └── templates/          # boilerplates para createProject (Factory)
    ├── indexer/
    │   ├── mod.rs
    │   ├── fts_index.rs        # SQLite FTS5
    │   ├── embeddings.rs       # llamada al sidecar Python para embeddings
    │   └── hybrid_search.rs    # BM25 + embeddings + metadata ranking
    ├── facade.rs               # FilesystemMcpFacade — entry point único
    └── events.rs               # mapping de Commands → GeoEvent
```

### 7.1 El Façade (entry point único hacia el resto del sistema)

```rust
// crates/geonexus-fs-mcp/src/facade.rs

pub struct FilesystemMcpFacade {
    guards: GuardChain,          // Chain of Responsibility
    indexer: Box<dyn SearchStrategy>,
    event_bus: Arc<EventBus>,
    config: FilesystemConfig,
}

impl FilesystemMcpFacade {
    pub async fn dispatch(
        &self,
        tool_name: &str,
        args: serde_json::Value,
        session_id: &str,
    ) -> Result<ToolResult, FsMcpError> {
        // 1. Construir el Command concreto
        let command = CommandFactory::build(tool_name, args)?;

        // 2. Pasar por la cadena de guards (puede devolver
        //    FsMcpError::ConfirmationRequired { preview } en vez de ejecutar)
        self.guards.check(&command, session_id).await?;

        // 3. Ejecutar, envuelto en auditoría (Decorator)
        let audited = AuditedOperation::wrap(command, self.event_bus.clone());
        let result = audited.execute().await?;

        // 4. Actualizar índice si la operación mutó el filesystem
        if result.mutated_fs {
            self.indexer.update_incremental(&result.affected_paths).await;
        }

        Ok(result)
    }
}
```

---

## 8. HERRAMIENTAS MCP (TOOL SPECS)

Cada tool sigue JSON Schema estricto (validado antes de ejecutar — nunca se confía en el args del LLM sin validar).

### 8.1 `listDirectories`
```json
{
  "name": "listDirectories",
  "level_required": "read",
  "input": { "path": "string (relativo a un allowedPath)" },
  "output": { "directories": [{ "name": "string", "path": "string", "itemCount": "number" }] }
}
```

### 8.2 `searchFiles`
```json
{
  "name": "searchFiles",
  "level_required": "read",
  "input": {
    "query": "string",
    "scope": "string (allowedPath label, opcional = todos)",
    "fileTypes": "string[] (opcional, ej. ['.shp','.geojson'])",
    "limit": "number (default 20, max 100)"
  },
  "output": { "results": [{ "path": "string", "score": "number", "snippet": "string" }] }
}
```

### 8.3 `readFile`
```json
{
  "name": "readFile",
  "level_required": "read",
  "constraints": ["maxFileSizeMb", "deniedExtensions", "secretFilePattern → requiere confirm"],
  "input": { "path": "string" },
  "output": { "content": "string", "truncated": "boolean", "encoding": "string" }
}
```

### 8.4 `createFolder` / `createFile`
```json
{
  "name": "createFile",
  "level_required": "write",
  "requires_confirm_if": "el archivo ya existe (overwrite)",
  "input": { "path": "string", "content": "string" },
  "output": { "created": "boolean", "path": "string" }
}
```

### 8.5 `updateFile`
```json
{
  "name": "updateFile",
  "level_required": "write",
  "input": { "path": "string", "content": "string", "diffPreview": "boolean (default true)" },
  "output": { "updated": "boolean", "diff": "string" }
}
```

### 8.6 `deleteFile` / `moveFile`
```json
{
  "name": "deleteFile",
  "level_required": "admin",
  "requires_confirm": true,
  "input": { "path": "string" },
  "output": { "deleted": "boolean" }
}
```

### 8.7 `analyzeProject` / `detectFramework`
```json
{
  "name": "detectFramework",
  "level_required": "read",
  "input": { "path": "string" },
  "output": {
    "framework": "string | null",
    "language": "string",
    "packageManager": "string | null",
    "confidence": "number"
  }
}
```
Heurística (orden de precedencia): `package.json` → React/Next/Vue/Angular (por dependencias) · `requirements.txt`/`pyproject.toml` → Python (FastAPI/Django por imports) · `pom.xml` → Java/Spring · `*.csproj` → .NET · `composer.json` → Laravel.

### 8.8 `createProject` (usa Factory de templates)
```json
{
  "name": "createProject",
  "level_required": "write",
  "requires_confirm": true,
  "input": { "name": "string", "framework": "string", "targetWorkspace": "string" },
  "output": { "path": "string", "filesCreated": "number" }
}
```

### 8.9 `copyFile`
Igual forma que `moveFile`, `level_required: "write"`, sin confirmación obligatoria salvo overwrite.

---

## 9. INDEXACIÓN Y BÚSQUEDA

**Regla dura:** nunca recorrer el disco completo en cada búsqueda. Todo pasa por `index.db` (SQLite + FTS5) por workspace, actualizado incrementalmente.

### 9.1 Esquema del índice (`.geonexus/index.db` dentro de cada workspace)

```sql
CREATE TABLE files (
    path TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    extension TEXT,
    size_bytes INTEGER,
    modified_at INTEGER,
    content_hash TEXT,
    last_indexed_at INTEGER NOT NULL
);

CREATE VIRTUAL TABLE files_fts USING fts5(
    name, path, content_preview,
    content='files', content_rowid='rowid'
);

CREATE TABLE file_embeddings (
    path TEXT PRIMARY KEY REFERENCES files(path),
    embedding BLOB NOT NULL,        -- vector serializado
    model_version TEXT NOT NULL
);
```

### 9.2 Estrategia de búsqueda híbrida (patrón Strategy)

```rust
pub struct HybridSearchStrategy {
    bm25: Fts5Strategy,
    semantic: EmbeddingStrategy,
    weights: (f32, f32), // (bm25_weight, semantic_weight) ej. (0.4, 0.6)
}

impl SearchStrategy for HybridSearchStrategy {
    async fn search(&self, query: &str, limit: usize) -> Vec<ScoredFile> {
        let bm25_results = self.bm25.search(query, limit * 2).await;
        let semantic_results = self.semantic.search(query, limit * 2).await;

        // Reciprocal Rank Fusion — mismo algoritmo que el RAG del chat (sección 17.2 de la auditoría)
        let fused = reciprocal_rank_fusion(vec![bm25_results, semantic_results]);

        // Metadata ranking: boost a archivos modificados recientemente
        // o que coinciden literalmente con extensión solicitada
        apply_metadata_boost(fused, limit)
    }
}
```

### 9.3 Actualización incremental

- Al recibir `create/update/delete` desde un Command, se actualiza **solo el archivo afectado** en `files` + `files_fts` + `file_embeddings` (nunca full re-scan).
- Un watcher en background (`notify` crate) detecta cambios externos (el usuario edita un archivo fuera de GeoNexus) y reindexar solo esos paths con debounce de 2s.
- Re-scan completo solo manual (`@filesystem reindexar`) o si `content_hash` global del workspace cambió más de un umbral (heurística anti-corrupción de índice).

---

## 10. INTEGRACIÓN CON EVENT BUS

Nuevos `EventType` (extienden el enum ya definido en el Master Plan, sección 5.1):

```rust
// añadir a crates/geonexus-core/src/events/types.rs

FileFound,          // payload: { path, score }
FileRead,           // payload: { path, size_bytes, truncated }
FolderCreated,      // payload: { path }
FileCreated,        // payload: { path }
FileUpdated,        // payload: { path, diff_summary }
FileDeleted,        // payload: { path } — SOLO se emite tras confirmación
FileMoved,          // payload: { from, to }
ProjectDetected,    // payload: { path, framework, language }
ProjectCreated,     // payload: { path, framework, files_created }
ConfirmationRequested, // payload: { action, target_path, preview } — pausa el pipeline
ConfirmationResolved,  // payload: { action, approved: bool }
```

Cada Command, al ejecutarse vía `AuditedOperation` (Decorator), emite automáticamente su evento correspondiente — el desarrollador de un nuevo Command no tiene que recordar emitir nada manualmente; el wrapper lo hace por convención de nombre.

---

## 11. INTEGRACIÓN CON WORKER POOL / CODING AGENT

El Filesystem MCP no reemplaza al `CodingWorker` — lo **alimenta**.

```
Usuario: "Crea una app React en mi carpeta de proyectos"
        ▼
PlannerWorker clasifica intent = "coding" + detecta @filesystem implícito
        ▼
FilesystemMcpFacade.dispatch("createProject", {framework: "react", ...})
        ▼ (emite ProjectCreated)
WorkerPool.submit(WorkerTask { worker: "coding", input: { project_path } })
        ▼
CodingWorker genera componentes DENTRO del path ya validado por PathGuard
        ▼ (cada archivo que crea pasa TAMBIÉN por createFile/updateFile del fs-mcp,
        ▼  nunca escribe a disco directamente — comparte el mismo guard chain)
ArtifactSystem registra el proyecto como Artifact { type: Code }
```

**Regla de diseño clave:** el `CodingWorker` no tiene acceso directo a `std::fs`. Toda escritura de archivos del Coding Worker pasa obligatoriamente por `FilesystemMcpFacade`, así hereda automáticamente el sandboxing, las confirmaciones y la auditoría sin duplicar lógica de seguridad en dos lugares.

---

## 12. UI: REASONING TIMELINE CON SHADCN/UI + MAGIC UI + MOTION

### 12.1 Stack visual

- **shadcn/ui** → primitives: `Card`, `Collapsible`, `Badge`, `Separator`, `ScrollArea`, `Dialog`
- **Magic UI** → `AnimatedList` (para la entrada secuencial de pasos), `BorderBeam` (para resaltar el paso activo), `NumberTicker` (para contar archivos encontrados en vivo), `Marquee` opcional para rutas largas
- **Motion (Framer Motion)** → orquestación de entrada/salida de pasos, expand/collapse, progreso del ícono "running → completed"

### 12.2 Componente: `FilesystemTimelineStep.tsx`

```tsx
import { motion, AnimatePresence } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { BorderBeam } from "@/components/magicui/border-beam";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { FolderSearch, FileCheck, FilePlus, Trash2, ChevronDown } from "lucide-react";

type FsStepStatus = "running" | "completed" | "failed" | "awaiting_confirmation";

interface FilesystemTimelineStepProps {
  icon: "search" | "read" | "create" | "delete";
  label: string;          // "Buscando archivos..."
  status: FsStepStatus;
  durationMs?: number;
  resultCount?: number;   // ej. 142 archivos encontrados
  details?: string[];     // rutas relevantes, máx 5 mostradas
  defaultOpen?: boolean;
}

const ICONS = { search: FolderSearch, read: FileCheck, create: FilePlus, delete: Trash2 };

export function FilesystemTimelineStep({
  icon, label, status, durationMs, resultCount, details = [], defaultOpen = false,
}: FilesystemTimelineStepProps) {
  const Icon = ICONS[icon];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <Card className="relative overflow-hidden border-muted">
        {status === "running" && (
          <BorderBeam size={60} duration={3} className="from-transparent via-primary to-transparent" />
        )}
        <Collapsible defaultOpen={defaultOpen}>
          <CollapsibleTrigger className="w-full">
            <CardContent className="flex items-center gap-3 py-3">
              <StatusIcon status={status} Icon={Icon} />

              <div className="flex-1 text-left">
                <p className="text-sm font-medium">{label}</p>
                {resultCount !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    <NumberTicker value={resultCount} className="font-semibold" /> resultados
                  </p>
                )}
              </div>

              {durationMs !== undefined && (
                <Badge variant="secondary" className="text-xs tabular-nums">
                  {(durationMs / 1000).toFixed(1)}s
                </Badge>
              )}

              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </CardContent>
          </CollapsibleTrigger>

          <AnimatePresence>
            <CollapsibleContent>
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-4 pb-3"
              >
                <ul className="space-y-1 border-l border-muted pl-3">
                  {details.slice(0, 5).map((d) => (
                    <li key={d} className="text-xs text-muted-foreground font-mono truncate">
                      {d}
                    </li>
                  ))}
                  {details.length > 5 && (
                    <li className="text-xs text-muted-foreground">
                      +{details.length - 5} más
                    </li>
                  )}
                </ul>
              </motion.div>
            </CollapsibleContent>
          </AnimatePresence>
        </Collapsible>
      </Card>
    </motion.div>
  );
}

function StatusIcon({ status, Icon }: { status: FsStepStatus; Icon: React.ElementType }) {
  if (status === "running") {
    return (
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}>
        <Icon className="h-4 w-4 text-primary" />
      </motion.div>
    );
  }
  if (status === "completed") {
    return (
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }}>
        <Icon className="h-4 w-4 text-emerald-500" />
      </motion.div>
    );
  }
  if (status === "awaiting_confirmation") {
    return <Icon className="h-4 w-4 text-amber-500 animate-pulse" />;
  }
  return <Icon className="h-4 w-4 text-destructive" />;
}
```

### 12.3 Lista orquestada: `FilesystemTimeline.tsx`

```tsx
import { AnimatedList } from "@/components/magicui/animated-list";
import { FilesystemTimelineStep } from "./FilesystemTimelineStep";
import { useEventBus } from "@/hooks/useEventBus";
import { useMemo } from "react";
import { mapFsEventToStep } from "./mapFsEventToStep";

export function FilesystemTimeline({ sessionId }: { sessionId: string }) {
  const events = useEventBus(sessionId);

  const steps = useMemo(
    () => events.filter((e) => e.event_type.startsWith("file_") || e.event_type.startsWith("project_"))
                .map(mapFsEventToStep),
    [events]
  );

  if (steps.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Filesystem MCP
      </p>
      <AnimatedList delay={150}>
        {steps.map((step) => (
          <FilesystemTimelineStep key={step.id} {...step} />
        ))}
      </AnimatedList>
    </div>
  );
}
```

> Nota: `AnimatedList` de Magic UI ya maneja la entrada secuencial con stagger — no se necesita lógica extra de `delay` manual por item.

---

## 13. UI: WIZARD DE PERMISOS Y DIÁLOGOS DE CONFIRMACIÓN

### 13.1 Wizard de primer uso — `FilesystemSetupWizard.tsx`

Usa `Dialog` (shadcn) + `Stepper` simple manejado con estado local, sin librería extra:

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "motion/react";
import { FolderOpen, Plus, X } from "lucide-react";

interface AllowedPathDraft { path: string; label: string; level: "read" | "write" }

export function FilesystemSetupWizard({ open, onConfirm }: {
  open: boolean;
  onConfirm: (paths: AllowedPathDraft[]) => void;
}) {
  const [paths, setPaths] = useState<AllowedPathDraft[]>([]);

  async function handleAddFolder() {
    const selected = await open_folder_dialog(); // tauri-plugin-dialog
    if (selected) {
      setPaths((p) => [...p, { path: selected, label: selected.split(/[/\\]/).pop()!, level: "read" }]);
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configuración de acceso a archivos</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Geo Agents solo accede a las carpetas que autorices aquí. Nada más.
          </p>
        </DialogHeader>

        <div className="space-y-2">
          {paths.map((p, i) => (
            <motion.div
              key={p.path}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between rounded-md border p-2"
            >
              <div className="flex items-center gap-2 truncate">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm truncate">{p.path}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{p.level}</Badge>
                <button onClick={() => setPaths((arr) => arr.filter((_, idx) => idx !== i))}>
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            </motion.div>
          ))}

          <Button variant="outline" size="sm" className="w-full gap-2" onClick={handleAddFolder}>
            <Plus className="h-4 w-4" /> Agregar carpeta
          </Button>
        </div>

        <DialogFooter>
          <Button disabled={paths.length === 0} onClick={() => onConfirm(paths)}>
            Guardar y continuar (modo solo lectura)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

Nota deliberada: el botón de confirmar dice explícitamente **"modo solo lectura"** porque ese es el nivel por defecto — el usuario nunca queda sorprendido por permisos de escritura que no pidió.

### 13.2 Diálogo de confirmación destructiva — `FilesystemConfirmDialog.tsx`

```tsx
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
         AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

interface ConfirmAction {
  action: "delete" | "move" | "overwrite" | "execute";
  targetPath: string;
  preview?: string; // ej. comando exacto a ejecutar, o diff del overwrite
}

export function FilesystemConfirmDialog({
  request, onApprove, onCancel,
}: { request: ConfirmAction | null; onApprove: () => void; onCancel: () => void }) {
  if (!request) return null;

  const labels: Record<ConfirmAction["action"], string> = {
    delete: "eliminar",
    move: "mover",
    overwrite: "sobrescribir",
    execute: "ejecutar un comando sobre",
  };

  return (
    <AlertDialog open={!!request}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" /> Confirmación requerida
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>Geo Agents quiere <strong>{labels[request.action]}</strong>:</p>
            <code className="block rounded bg-muted px-2 py-1 text-xs break-all">
              {request.targetPath}
            </code>
            {request.preview && (
              <pre className="rounded bg-muted px-2 py-1 text-xs max-h-32 overflow-auto">
                {request.preview}
              </pre>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onApprove} className="bg-destructive hover:bg-destructive/90">
            Permitir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

Este diálogo escucha el evento `ConfirmationRequested` del Event Bus y **pausa el Worker correspondiente** hasta recibir `ConfirmationResolved`. El pipeline de Rust queda literalmente bloqueado en un `await` sobre un oneshot channel hasta que el comando Tauri `resolve_confirmation()` lo libera.

```rust
// crates/geonexus-fs-mcp/src/security/confirm_gate.rs

pub struct ConfirmGate {
    pending: Arc<Mutex<HashMap<String, oneshot::Sender<bool>>>>,
}

impl ConfirmGate {
    pub async fn require(&self, request_id: String, preview: ConfirmPreview, bus: &EventBus) -> bool {
        let (tx, rx) = oneshot::channel();
        self.pending.lock().await.insert(request_id.clone(), tx);

        bus.emit(GeoEvent::confirmation_requested(&request_id, preview)).await;

        rx.await.unwrap_or(false) // si el canal se cierra sin respuesta → deny por defecto
    }

    pub async fn resolve(&self, request_id: &str, approved: bool) {
        if let Some(tx) = self.pending.lock().await.remove(request_id) {
            let _ = tx.send(approved);
        }
    }
}
```

---

## 14. BASE DE DATOS: TABLAS NUEVAS

```sql
-- migrations/007_filesystem_mcp.sql

CREATE TABLE IF NOT EXISTS fs_allowed_paths (
    id TEXT PRIMARY KEY,
    path TEXT NOT NULL UNIQUE,       -- ruta canonicalizada
    label TEXT NOT NULL,
    level TEXT NOT NULL DEFAULT 'read',  -- read | write | execute | admin
    added_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS fs_audit_log (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    target_path TEXT NOT NULL,
    level_required TEXT NOT NULL,
    approved INTEGER NOT NULL,        -- 0/1, refleja si pasó los guards
    confirmed_by_user INTEGER,        -- NULL si no requería confirmación
    duration_ms INTEGER,
    error TEXT,
    created_at INTEGER NOT NULL
);
CREATE INDEX idx_fs_audit_session ON fs_audit_log(session_id, created_at DESC);

CREATE TABLE IF NOT EXISTS fs_pending_confirmations (
    request_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    action TEXT NOT NULL,
    target_path TEXT NOT NULL,
    preview TEXT,
    created_at INTEGER NOT NULL,
    resolved_at INTEGER,
    approved INTEGER
);
```

> `fs_audit_log` se llena **incluso cuando una operación es rechazada** por un guard. Es la traza forense: si algo intentó salir del sandbox, queda registrado con `approved = 0` y el motivo en `error`.

---

## 15. CHECKLIST DE SEGURIDAD (NO NEGOCIABLE)

Antes de dar este MCP por "listo para producción", verificar **cada uno** de estos puntos:

- [ ] `PathGuard::validate()` se llama en **el 100%** de los Commands, sin excepción, incluyendo `analyzeProject` (que parece "solo lectura" pero también puede ser vector de path traversal).
- [ ] Test automatizado: `../../../etc/passwd`, symlinks apuntando fuera del workspace, y rutas UNC (`\\server\share`) son rechazadas.
- [ ] Ningún Command escribe a disco usando `std::fs` directamente fuera de `geonexus-fs-mcp` — grep del repo para confirmar que `CodingWorker` y otros no bypasean el Façade.
- [ ] `.env`, `*secret*`, `*credentials*`, `id_rsa*` quedan excluidos del índice y requieren confirmación explícita para lectura.
- [ ] Extensiones ejecutables denegadas incluso bajo nivel `ADMIN`.
- [ ] Toda operación con `requires_confirm: true` bloquea efectivamente el Worker (test: simular timeout sin respuesta del usuario → debe resolver en `deny`, nunca en `allow` por defecto).
- [ ] `fs_audit_log` registra también los intentos rechazados, no solo los exitosos.
- [ ] Rate limiting probado bajo loop adversarial (un Worker con bug que intente escribir 1000 archivos/segundo debe frenarse).
- [ ] El wizard nunca preselecciona carpetas sensibles del sistema (home completo, `C:\`, `/`) como sugerencia por defecto.

---

## 16. ROADMAP DE IMPLEMENTACIÓN

| Fase | Entregable | Horas est. |
|---|---|---|
| **F1** | `PathGuard` + tests de path traversal + `filesystem.config.json` loader | 6h |
| **F2** | Commands de solo lectura: `listDirectories`, `listFiles`, `searchFiles` (sin índice, scan directo limitado) | 6h |
| **F3** | Indexer FTS5 + actualización incremental + `HybridSearchStrategy` | 10h |
| **F4** | Commands de escritura: `createFolder`, `createFile`, `updateFile` + `ConfirmGate` para overwrite | 8h |
| **F5** | Commands destructivos: `deleteFile`, `moveFile` + diálogo de confirmación end-to-end | 6h |
| **F6** | `analyzeProject` + `detectFramework` + `createProject` (Factory de templates) | 10h |
| **F7** | Integración Event Bus completa + `FilesystemTimeline` UI (shadcn + Magic UI + Motion) | 8h |
| **F8** | Wizard de onboarding + página de gestión de `allowedPaths` (agregar/quitar/cambiar nivel) | 6h |
| **F9** | Integración con `CodingWorker` (forzar que use el Façade, no `std::fs`) | 4h |
| **F10** | Auditoría de seguridad completa contra el checklist de la sección 15 | 6h |
| **Total** | | **~70h** |

Orden estricto: **F1 → F2 → F4 → F5 antes que nada de UI vistosa.** El sandboxing no es negociable y no se paraleliza con features.

---

## 17. ESTRUCTURA FINAL DE ARCHIVOS

```
crates/geonexus-fs-mcp/                  # Rust — ver sección 7
src/
├── modules/filesystem/
│   ├── FilesystemSetupWizard.tsx        # sección 13.1
│   ├── FilesystemConfirmDialog.tsx      # sección 13.2
│   ├── FilesystemTimeline.tsx           # sección 12.3
│   ├── FilesystemTimelineStep.tsx       # sección 12.2
│   ├── mapFsEventToStep.ts
│   └── useFilesystemConfig.ts           # CRUD sobre allowedPaths desde UI
├── types/
│   └── filesystem.ts                    # AllowedPath, FsLevel, ConfirmAction
~/.geonexus/
└── filesystem.config.json               # sección 4.2 — NUNCA editable por el agente
<workspace>/.geonexus/
├── index.db                              # FTS5 + embeddings, sección 9.1
└── workspace.json                        # framework detectado, last_scan
```

---

*Fin del documento. Este Filesystem MCP se integra directamente con el Event Bus, Worker Pool y Artifact System definidos en el Master Plan V3 — no introduce ningún sistema paralelo de eventos ni de almacenamiento.*
