# GeoNexus - Documentación Completa

## 1. Descripción General del Proyecto

**GeoNexus** es una plataforma desktop de agentes IA para análisis de documentos, consulta normativa y gestión de conocimiento territorial. Permite conversar con modelos locales o cloud, indexar documentos, explorar un grafo de conocimiento y auditar cada ejecución.

### Características Principales

| Característica | Descripción |
|----------------|-------------|
| **Chat IA Multimodelo** | Conversación contextual con modelos locales (Ollama, LM Studio) o cloud (OpenAI, Anthropic, OpenRouter). Soporta tool-calling, web search y @menciones. |
| **Indexación Documental** | Sube PDFs, DOCX, TXT y archivos técnicos → extrae texto → chunkifica → genera embeddings → almacena en ChromaDB para búsqueda RAG. |
| **Grafo de Conocimiento** | Red de nodos (documentos, entidades, conceptos) y aristas que se construye automáticamente al chatear e indexar. Visualización interactiva con zoom/arrastre. |
| **Conectores Datos** | Fuentes de datos: carpetas locales, OneDrive (próximamente Google Drive, SharePoint, Dropbox, S3). Cachea archivos y los indexa. |
| **Containers MCP** | Sistema de herramientas MCP para operar archivos: listar, buscar, sincronizar y subir documentos desde conectores registrados. |
| **Análisis y Métricas** | Dashboard de uso: tokens por modelo, consultas top, skills usadas, costo estimado y trazas de ejecución con paginación. |
| **Agentes de IA** | 5 agentes preconfigurados (Indexador, Embedder, Grafo, Clasificador, Chat IA) activables desde Configuración. |
| **Notificaciones** | Sistema de notificaciones configurable por categoría y canal (toast, sistema, sonido). |

---

## 2. Arquitectura del Sistema

### Stack Tecnológico

| Capa | Tecnologías |
|------|-------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Radix UI, Lucide, Recharts |
| **Desktop** | Tauri 2 |
| **Backend Rust** | geonexus-core, geonexus-db (SQLite), geonexus-mcp, geonexus-tauri |
| **Sidecar Python** | ChromaDB, extracción de texto, embeddings, búsqueda web, NER |
| **Base de Datos** | SQLite (12 tablas) + ChromaDB (vectores) |
| **IA Local** | Ollama, LM Studio |
| **IA Cloud** | OpenAI, Anthropic, OpenRouter |

### Diagrama de Arquitectura

```
React Frontend (TypeScript)
  ├── Chat / Documentos / Grafo / Análisis
  ├── API layer (src/api/*.ts → invoke Tauri)
  └── Paneles: Trazas, Agentes, Notificaciones, Configuración
        │
  Tauri IPC (invoke / events)
        │
  Rust Backend (56+ commands)
  ├── geonexus-core     → tipos, lógica de negocio
  ├── geonexus-db       → repositorios SQLite (12 tablas)
  ├── geonexus-mcp      → containers MCP (local, cloud)
  └── geonexus-tauri    → commands, eventos, AppState
        │
  Python Sidecar (ai/sidecar.py)
  ├── index             → extracción + chunk + embedding
  ├── recall_chunks     → RAG vectorial (ChromaDB)
  ├── chat_llm          → comunicación con LLMs
  ├── search_web        → búsqueda web
  ├── extract_entities  → NER para grafo de conocimiento
  └── ping_llm          → health check
```

### Principios de Diseño

1. **Offline-first**: Ollama + SQLite + ChromaDB permiten operar sin internet.
2. **Multi-LLM**: El proveedor de IA se cambia sin reiniciar.
3. **Trazabilidad**: Cada operación conserva `trace_id` para auditoría.
4. **MCP-extensible**: Nuevas herramientas se conectan como servidores MCP.
5. **Seguridad**: Keys en keychain, allowlist localhost, tokens OAuth.

---

## 3. Estructura del Proyecto

```
GeoNexus/
├── agent/                    # Configuración de agentes
│   ├── IDENTITY.md
│   ├── SOUL.md
│   └── USER.md
├── ai/                       # Python sidecar
│   ├── context/              # Construcción de contexto
│   ├── docs/                 # Lector y chunker de documentos
│   ├── extractors/           # Extractores de datos (ej: shapefile)
│   ├── geonexus_ai/
│   ├── gis/                  # Utilidades GIS
│   ├── graph/                # Grafo de conocimiento
│   ├── llm/                  # Router y proveedores LLM
│   ├── memory/               # ChromaDB y embeddings
│   ├── pipeline/             # Pipeline de indexación
│   ├── recall/               # Búsqueda y recall
│   ├── README.md
│   ├── requirements.txt
│   ├── sidecar.py            # Sidecar principal
│   └── web_search.py         # Búsqueda web
├── chroma_db/                # Base de datos ChromaDB
├── crates/                   # Crates Rust
│   ├── geonexus-core/        # Tipos compartidos
│   ├── geonexus-db/          # Repositorios SQLite + migraciones
│   ├── geonexus-mcp/         # Implementación MCP
│   └── geonexus-tauri/       # Comandos Tauri + UI shell
├── docs/                     # Documentación del proyecto
├── mcp-servers/              # Servidores MCP
│   └── containers-mcp/       # Containers MCP
├── public/                   # Archivos públicos
├── src/                      # Frontend React
│   ├── __tests__/            # Tests
│   ├── api/                  # Wrappers Tauri invoke
│   ├── assets/               # Recursos
│   ├── components/           # Componentes UI
│   │   ├── chat/             # Componentes de chat
│   │   ├── brand/            # Marca y logos
│   │   └── ui/               # Componentes UI base (shadcn)
│   ├── config/               # Configuración
│   ├── contexts/             # Contextos React
│   └── features/             # Features principales
│       ├── agents/
│       ├── ai/
│       ├── map/
│       ├── theme/
│       ├── tools/
│       └── workspace/        # Workspace principal
├── .gitignore
├── Cargo.lock
├── Cargo.toml
├── README.md
├── components.json
├── index.html
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
└── postcss.config.cjs
```

---

## 4. Componentes Principales

### 4.1 Frontend - React/TypeScript

#### Chat IA

| Componente | Ubicación | Descripción |
|------------|-----------|-------------|
| `ChatPanel` | `src/components/chat/ChatPanel.tsx` | Orquestador principal: sidebar conversaciones, transcripción, composer, project context panel |
| `ChatComposer` | `src/components/chat/ChatComposer.tsx` | Input con @mentions, /comandos, chips de fuentes, skill badges, web search toggle |
| `ChatTranscript` | `src/components/chat/ChatTranscript.tsx` | Lista scrollable de mensajes con user message y assistant message |
| `AssistantMessage` | `src/components/chat/AssistantMessage.tsx` | Mensaje IA: markdown, deep research, citas, sugerencias, conexiones, stats |
| `CitationsBlock` | `src/components/chat/CitationsBlock.tsx` | Citas por chunk colapsables con asset name + score |
| `DeepResearchPanel` | `src/components/chat/DeepResearchPanel.tsx` | Panel de búsqueda web profunda |
| `MentionPicker` | `src/components/chat/MentionPicker.tsx` | @mentions con grupos (connector, asset, graph node, skill, agent source) |
| `ModelSelector` | `src/components/chat/ModelSelector.tsx` | Selector de modelo LLM |
| `CommandPalette` | `src/components/chat/CommandPalette.tsx` | Paleta de comandos (/) |

#### Grafo de Conocimiento

| Componente | Ubicación | Descripción |
|------------|-----------|-------------|
| `GraphPage` | `src/features/workspace/graph/GraphPage.tsx` | Página principal del grafo: SVG con d3-force, node sheet, filters, legend |
| `NodeSheet` | - | Detalle del nodo: weight, evidencia, relaciones, "Use in AI" |
| `GraphFilters` | - | 11 opciones (All + 10 tipos) + búsqueda por substring |
| `GraphLegend` | - | 10 colores por tipo |
| `GraphActivityPanel` | - | Últimos nodos + botón "Limpiar efímeros" |

#### Análisis y Métricas

| Componente | Ubicación | Descripción |
|------------|-----------|-------------|
| `AnalysisPage` | `src/features/workspace/analysis/AnalysisPage.tsx` | Página principal de análisis |
| `AnalysisMetrics` | - | 4 cards: tokens hoy, consultas IA, costo estimado, trazas guardadas |
| `TokenChart` | - | SVG line + barras input/output, hover tooltip, selector Hoy/7d/30d |
| `AnalysisRunsTable` | - | Paginación 10/page, click → Dialog detalle |
| `ModelUsagePanel` | - | Usage por modelo, clickeable con diálogo detalle |
| `SkillPanel` | - | Skills más usadas con semáforo (≥90 verde) |

#### MCP (Model Context Protocol)

| Componente | Ubicación | Descripción |
|------------|-----------|-------------|
| `McpServersPage` | `src/features/workspace/mcp/McpServersPage.tsx` | Página de servidores MCP |
| `McpServerCard` | `src/features/workspace/mcp/McpServerCard.tsx` | Tarjeta de servidor: status, ping, tools count |
| `McpRegisterDialog` | `src/features/workspace/mcp/McpRegisterDialog.tsx` | Diálogo para registrar servidor MCP |
| `McpToolsViewer` | `src/features/workspace/mcp/McpToolsViewer.tsx` | Visor de herramientas MCP |
| `McpConsole` | `src/features/workspace/mcp/McpConsole.tsx` | Consola MCP |

#### Skills

| Componente | Ubicación | Descripción |
|------------|-----------|-------------|
| `SkillsPage` | `src/features/workspace/skills/SkillsPage.tsx` | Página principal de skills |
| `SkillCard` | `src/features/workspace/skills/SkillCard.tsx` | Tarjeta de skill: icono, nombre, categoría, toggle, badges |
| `SkillDetailDrawer` | `src/features/workspace/skills/SkillDetailDrawer.tsx` | Drawer con SKILL.md raw + syntax highlighting |
| `InstallSkillDialog` | `src/features/workspace/skills/InstallSkillDialog.tsx` | Diálogo para instalar skill desde GitHub o archivo |
| `SkillActivationBadge` | `src/features/workspace/skills/SkillActivationBadge.tsx` | Badge para mostrar skills activos en chat |

### 4.2 Backend - Rust

#### Crates

| Crate | Ubicación | Descripción |
|-------|-----------|-------------|
| `geonexus-core` | `crates/geonexus-core/` | Tipos compartidos: Message, GraphNode, Asset, etc. |
| `geonexus-db` | `crates/geonexus-db/` | Repositorios SQLite + migraciones (12 tablas) |
| `geonexus-mcp` | `crates/geonexus-mcp/` | Implementación del Model Context Protocol |
| `geonexus-tauri` | `crates/geonexus-tauri/` | Comandos Tauri + UI shell |

#### Comandos Tauri Principales

| Categoría | Comandos |
|-----------|----------|
| **Chat** | `send_message`, `classify_message`, `list_conversations`, `get_conversation` |
| **LLM** | `list_llm_models`, `ping_llm_provider`, `setup_llm_provider` |
| **Documentos** | `index_document`, `rebuild_knowledge_graph`, `list_documents` |
| **Datos** | `list_data_assets`, `get_data_asset`, `get_data_store_metrics` |
| **Grafo** | `list_graph_nodes`, `list_graph_edges`, `search_graph_nodes`, `update_node_position`, `pin_node`, `merge_nodes` |
| **Conectores** | `register_local_connector`, `list_connector_files`, `cache_connector_file`, `sync_connector` |
| **MCP** | `list_mcp_servers`, `register_mcp_server`, `delete_mcp_server`, `ping_mcp_server`, `list_mcp_tools`, `call_mcp_tool`, `discover_stdio_tools`, `import_mcp_config`, `export_mcp_config` |
| **Skills** | `list_skills`, `install_skill_from_file`, `install_skill_from_github`, `toggle_skill`, `read_skill_md` |
| **Análisis** | `get_analysis_metrics`, `get_token_timeline`, `get_model_usage`, `list_analysis_runs`, `export_traces_csv`, `export_traces_json` |

### 4.3 Sidecar - Python

| Módulo | Ubicación | Descripción |
|--------|-----------|-------------|
| `sidecar.py` | `ai/sidecar.py` | Sidecar principal: punto de entrada para todas las acciones |
| `llm/router.py` | `ai/llm/router.py` | Router LLM: detecta proveedor y envía requests |
| `llm/ollama.py` | `ai/llm/ollama.py` | Cliente Ollama |
| `llm/openai.py` | `ai/llm/openai.py` | Cliente OpenAI |
| `llm/anthropic.py` | `ai/llm/anthropic.py` | Cliente Anthropic |
| `llm/lmstudio.py` | `ai/llm/lmstudio.py` | Cliente LM Studio |
| `llm/openrouter.py` | `ai/llm/openrouter.py` | Cliente OpenRouter |
| `memory/chroma.py` | `ai/memory/chroma.py` | Cliente ChromaDB |
| `memory/embeddings.py` | `ai/memory/embeddings.py` | Generación de embeddings |
| `docs/reader.py` | `ai/docs/reader.py` | Lector de documentos (PDF, DOCX, TXT) |
| `docs/chunker.py` | `ai/docs/chunker.py` | Chunker de texto |
| `graph/extractor.py` | `ai/graph/extractor.py` | Extractor de entidades desde documentos |
| `graph/chat_extractor.py` | `ai/graph/chat_extractor.py` | Extractor de entidades desde chat |
| `graph/layout.py` | `ai/graph/layout.py` | Layout del grafo |
| `pipeline/indexer.py` | `ai/pipeline/indexer.py` | Pipeline de indexación |
| `context/builder.py` | `ai/context/builder.py` | Constructor de contexto |
| `recall/keyword_extractor.py` | `ai/recall/keyword_extractor.py` | Extractor de keywords para recall |
| `web_search.py` | `ai/web_search.py` | Búsqueda web (DuckDuckGo, Google, Bing, SerpAPI) |

---

## 5. Base de Datos

### SQLite - Tablas Principales

| Tabla | Descripción |
|-------|-------------|
| `assets` | Activos de datos (documentos, archivos) |
| `document_chunks` | Chunks de documentos indexados |
| `conversations` | Historial de conversaciones |
| `messages` | Mensajes de chat |
| `chat_tool_calls` | Llamadas a herramientas desde chat |
| `graph_nodes` | Nodos del grafo de conocimiento |
| `graph_edges` | Aristas del grafo de conocimiento |
| `connectors` | Conectores de datos |
| `mcp_servers` | Servidores MCP registrados |
| `mcp_tools` | Herramientas MCP descubiertas |
| `mcp_allowlist` | Allowlist de herramientas MCP |
| `mcp_tool_calls` | Auditoría de llamadas a tools MCP |
| `skills` | Skills instalados |
| `skill_activations` | Activaciones de skills en conversaciones |
| `app_settings` | Configuración de la app (key/value) |
| `analysis_sessions` | Sesiones de análisis |
| `message_stats` | Estadísticas de mensajes |

### ChromaDB - Colecciones

Almacena vectores de embeddings para búsqueda semántica RAG.

---

## 6. Funcionalidades Detalladas

### 6.1 Chat IA - Flujo Completo

```
1. Usuario escribe mensaje en ChatComposer
   ↓
2. useChatSession.submit()
   ↓
3. api/chat.ts → invoke("send_message")
   ↓
4. Rust send_message() en geonexus-tauri
   ├─ Valida input / crea conversación / guarda user msg
   ├─ Classify intent (QueryIntent)
   ├─ Graph context (graph_nodes + graph_edges)
   ├─ RAG recall (Python sidecar — ChromaDB chunks reales)
   ├─ Build chunk references (asset_name lookup, text_preview, score)
   ├─ Project context (sidecar build_project_context)
   ├─ Mention context (connectors, assets, graph_nodes)
   ├─ Skills context (skills activos — lee SKILL.md de SQLite)
   ├─ Web search opcional (sidecar search_web)
   ├─ Build messages array (system + context + history + user)
   ├─ Tool-calling loop (max 10 iter, tools: read_file, search_code, list_directory, glob_files)
   ├─ Extraer MessageStats
   ├─ Guardar assistant msg
   └─ Responder con SendMessageResponse
   ↓
5. Frontend recibe respuesta y actualiza ChatTranscript
```

### 6.2 Indexación de Documentos

```
1. Usuario sube documento (PDF/DOCX/TXT)
   ↓
2. docs/reader.py extrae texto
   ↓
3. docs/chunker.py divide texto en chunks
   ↓
4. memory/embeddings.py genera embeddings
   ↓
5. memory/chroma.py almacena en ChromaDB
   ↓
6. graph/extractor.py extrae entidades del documento
   ↓
7. Rust inserta assets, document_chunks, graph_nodes, graph_edges en SQLite
```

### 6.3 Grafo de Conocimiento

#### Tipos de Nodos

| Tipo | Descripción |
|------|-------------|
| `norma` | Artículos, normativas, regulaciones |
| `documento` | Documentos indexados |
| `capa` | Capas GIS |
| `zona` | Zonas geográficas |
| `concepto` | Conceptos temáticos |
| `chat_turn` | Turnos de conversación |
| `web_search` | Resultados de búsqueda web |
| `upload` | Archivos subidos |
| `connector` | Conectores de datos |
| `rag_recall` | Chunks recuperados via RAG |

#### Extracción Automática

- **Desde documentos**: Regex para artículos, zonas, conceptos hardcodeados
- **Desde chat**: 5 niveles de extracción (definiciones, acrónimos, términos capitalizados, tech keywords, regex)
- **Nodos efímeros**: Creados desde chat, se pueden limpiar con "Limpiar efímeros"

### 6.4 Proveedores LLM

| Proveedor | Tipo | Endpoint | Requerimientos |
|-----------|------|----------|----------------|
| **Ollama** | Local | `http://localhost:11434` | Ollama instalado y corriendo |
| **LM Studio** | Local | `http://localhost:1234/v1` | LM Studio con modelo cargado |
| **OpenAI** | Cloud | `https://api.openai.com/v1` | `OPENAI_API_KEY` |
| **Anthropic** | Cloud | `https://api.anthropic.com` | `ANTHROPIC_API_KEY` |
| **OpenRouter** | Cloud | `https://openrouter.ai/api/v1` | `OPENROUTER_API_KEY` |

### 6.5 Skills

#### ¿Qué es un Skill?

Un Skill es un archivo `SKILL.md` con frontmatter YAML estructurado:

```markdown
---
name: pot-analyzer
description: Analiza documentos POT colombianos.
version: 1.0.0
author: Code Clean / GeoNexus
category: gis
tags: [POT, PBOT, usos-suelo]
mcp-servers: [memory-mcp, qgis-mcp]
---

# Contenido markdown...
- Instrucciones especializadas
- Protocolos de análisis
- Reglas de formato
```

#### Categorías de Skills

- `gis` - Análisis geográfico
- `research` - Investigación
- `data` - Manipulación de datos
- `agent` - Comportamiento de agentes
- `tool` - Herramientas
- `connector` - Conectores

#### Flujo de Uso

1. **Instalar**: SkillsPage → "+ Instalar skill" → GitHub URL o archivo local
2. **Activar**: Toggle on/off en SkillsPage o @mention en chat
3. **Usar**: Skill se inyecta como system message en el prompt del LLM

### 6.6 MCP (Model Context Protocol)

#### Tipos de Transporte

| Transporte | Descripción |
|------------|-------------|
| `Http` | Servidor HTTP |
| `Stdio` | Proceso hijo via stdin/stdout |
| `Sse` | Server-Sent Events |

#### Flujo de Registro de Servidor STDIO

```
1. McpRegisterDialog → register_mcp_server (Tauri)
   ↓
2. INSERT en mcp_servers (SQLite)
   ↓
3. stdio::discover_tools() [auto]
   ├─ Spawn proceso hijo
   ├─ Envía initialize (JSON-RPC 2.0)
   ├─ Envía notifications/initialized
   ├─ Envía tools/list
   ├─ Lee respuesta (tolerante a logs/whitespace)
   └─ Parse result.tools
   ↓
4. upsert_tool() por cada tool descubierta
   ↓
5. UPDATE tools_count
   ↓
6. UI refresca con tools visibles
```

---

## 7. Instalación y Desarrollo

### Requisitos Previos

- **Windows 10/11** (64 bits)
- **Git**
- **Node.js 18+**
- **pnpm**
- **Rust toolchain** (https://rustup.rs)
- **Python 3.10+** con `pip`
- **(Opcional)** Ollama o LM Studio para IA local

### Pasos de Instalación

```powershell
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/GeoNexus.git
cd GeoNexus

# 2. Instalar dependencias del frontend
pnpm install

# 3. Instalar dependencias Python (sidecar)
pip install -r ai/requirements.txt

# 4. Iniciar en modo desarrollo
pnpm tauri:dev

# 5. Compilar para producción
pnpm tauri:build
```

### Vista Previa Web (sin Tauri)

```powershell
pnpm dev
# Abre http://localhost:1420
# Nota: las funciones Tauri (archivos, BD) no estarán disponibles
```

---

## 8. Scripts Disponibles

### Frontend

| Script | Descripción |
|--------|-------------|
| `pnpm dev` | Inicia dev server Vite |
| `pnpm build` | Compila frontend para producción |
| `pnpm preview` | Previsualiza build de producción |
| `pnpm test` | Ejecuta tests Vitest |
| `pnpm test:watch` | Ejecuta tests en modo watch |

### Tauri

| Script | Descripción |
|--------|-------------|
| `pnpm tauri:dev` | Inicia app Tauri en modo desarrollo |
| `pnpm tauri:build` | Compila app Tauri para producción |

---

## 9. Estado del Proyecto

| Fase | Estado |
|------|--------|
| Inventario y metadata local | ✅ Completo |
| Conector local y cache | ✅ Completo |
| Indexación documental y vectorial | ✅ Completo |
| Containers MCP | ✅ Completo |
| OAuth (OneDrive/Cloud) | ❌ Pendiente |
| LLM base (ping, list, send) | ✅ Completo |
| Chat con memoria (RAG, tools, grafo) | ✅ Completo |
| Auto-detección de modelos | ✅ Completo |
| RAG + contexto GIS | ✅ Completo |

**Stats**:
- 56+ comandos Tauri
- 12 tablas SQLite
- 81 tests Rust
- 62 tests TypeScript

---

## 10. Roadmap y Mejoras Futuras

### Prioridad Alta

1. OAuth para OneDrive/Google Drive/SharePoint
2. Zoom y pan en GraphPage
3. Exportar grafo a SVG/PNG
4. UI para pin/merge/delete de nodos desde GraphPage
5. NLP semántico en extractores (spaCy, NLTK)
6. Deduplicación automática de nodos
7. Stronghold keychain para tokens (actualmente SQLite)

### Prioridad Media

1. Marketplace de skills
2. Skill dependencies
3. Skill testing
4. Skill editor integrado
5. Compartir skills export/import
6. Rate limiting por skill
7. Templates de skills
8. Análisis de red del grafo (caminos, clusters, comunidades)
9. Dashboard de monitoreo MCP en tiempo real

### Prioridad Baja

1. Tests E2E de componentes frontend
2. Multi-idioma (i18n)
3. Temas visuales adicionales
4. PWA support

---

## 11. Contribuir

1. Fork el repositorio
2. Crea una rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

---

## 12. Licencia

Uso interno — GeoNexus

---

## 13. Contacto y Soporte

Para preguntas, issues o soporte, contacta al equipo de GeoNexus.

---

**Última actualización**: Junio 2026
