# GeoNexus

**GeoNexus** es una plataforma desktop de agentes IA para análisis de documentos, consulta normativa, gestión de conocimiento territorial y generación automatizada de proyectos de código. Integra múltiples proveedores de lenguaje (locales y cloud), indexación vectorial (RAG), grafos de conocimiento, un sistema de agentes de codigo con revisión de planes, y un sidecar Python para tareas de IA.

![GeoNexus](public/Geonexus.png)

---

## Funcionalidades

### Chat IA Multi-Proveedor
- Conversación contextual con modelos locales (Ollama, LM Studio) o cloud (OpenAI, Anthropic, OpenRouter).
- Soporte para tool-calling, búsqueda web, y @menciones a skills y fuentes.
- Cambio de proveedor en caliente sin reiniciar la aplicación.
- Historial de conversaciones por sesión con almacenamiento local.

### Sistema de Razonamiento (Reasoning)
- Visualización en tiempo real del pipeline de razonamiento del LLM.
- Bloques de pensamiento expandibles (ThinkingBlock), trazas de tool calls (ToolCallTrace), y trazas de pipeline completo (PipelineTrace).
- Pill de estado de pensamiento con spinner animado (ThinkingPill).

### Agente de Código (Coding Agent)
- Generación automatizada de proyectos de código mediante prompts en lenguaje natural.
- Llamada a LLM via sidecar Python para generar planes estructurados con resumen, archivos propuestos, nivel de riesgo y justificación.
- **Flujo de revisión de plan:** el usuario revisa el plan propuesto (archivos, riesgo, descripción) antes de aprobar. Soporta edición de instrucciones y cancelación.
- **Permisos por riesgo:** detecta archivos existentes y muestra un banner de advertencia con opciones Permitir/Denegar.
- **Carga de proyectos existentes:** selector de carpeta nativo que analiza el proyecto, detecta lenguajes y muestra los archivos en un árbol con distinción de archivos originales vs generados.
- Visualización de archivos lado a lado (árbol + contenido).
- Fallback automático a un plan HTML básico cuando no hay LLM configurado.

### Indexación Documental y RAG
- Subida de PDFs, DOCX, TXT y archivos técnicos.
- Extracción de texto → chunkificación → generación de embeddings → almacenamiento en ChromaDB.
- Búsqueda RAG vectorial con recuperación de contexto para respuestas trazables.

### Grafo de Conocimiento
- Red de nodos (documentos, entidades, conceptos) y aristas construida automáticamente al chatear e indexar.
- Visualización interactiva con zoom, arrastre y colores por tipo.
- Extracción de entidades mediante NER (Python sidecar).

### Conectores de Datos
- Fuentes de datos: carpetas locales, OneDrive.
- Cacheo de archivos e indexación automática.
- Arquitectura extensible para futuros conectores (Google Drive, SharePoint, Dropbox, S3).

### Containers MCP
- Sistema de herramientas MCP para operar archivos: listar, buscar, sincronizar y subir documentos.
- Arquitectura de servidores MCP extensible.

### Dashboard de Análisis y Métricas
- Uso de tokens por modelo, consultas top, skills utilizadas, costo estimado.
- Trazas de ejecución con paginación y trazabilidad por `trace_id`.
- Panel de actividad reciente con eventos en tiempo real.

### Integración Telegram
- Bot de Telegram para interactuar con la plataforma de forma remota.
- Comandos personalizados para consultas y operaciones.

### Notificaciones
- Sistema configurable por categoría y canal (toast, sistema, sonido).

---

## Stack Técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS 4, Radix UI, Lucide |
| Desktop | Tauri 2 |
| Backend Rust | geonexus-core, geonexus-db (SQLite), geonexus-mcp, geonexus-tauri |
| Sidecar Python | ChromaDB, extracción de texto, embeddings, búsqueda web, NER |
| Base de datos | SQLite (12 tablas) + ChromaDB (vectores) |
| IA local | Ollama, LM Studio |
| IA cloud | OpenAI, Anthropic, OpenRouter |

---

## Arquitectura

```
React Frontend (TypeScript)
  ├── Chat / Agente de Código / Documentos / Grafo / Análisis
  ├── Componentes de razonamiento (ThinkingBlock, ToolCallTrace, PipelineTrace)
  ├── Componentes de agente (CodingAgentPanel, AgentFileTree, AgentProjectDropzone, AgentTimeline)
  ├── API layer (src/api/*.ts → invoke Tauri)
  └── Paneles: Trazas, Agentes, Notificaciones, Configuración
        │
 Tauri IPC (invoke / events)
        │
 Rust Backend (60+ commands)
  ├── geonexus-core        → tipos, lógica de negocio
  ├── geonexus-db          → repositorios SQLite (12 tablas)
  ├── geonexus-mcp         → containers MCP (local, cloud)
  ├── geonexus-tauri       → commands, eventos, AppState
  │   ├── commands/coding_agent    → generación con LLM, plan-review, permisos, carga de proyectos
  │   ├── commands/llm             → comunicación con sidecar Python
  │   ├── commands/telegram        → integración con bot de Telegram
  │   ├── commands/filesystem      → selector de carpetas, lectura de archivos
  │   └── commands/documents       → gestión documental e indexación
  └── events               → eventos agente: plan_ready, file_created, permission_required, etc.
        │
 Python Sidecar (ai/sidecar.py)
  ├── index               → extracción + chunk + embedding
  ├── recall_chunks       → RAG vectorial (ChromaDB)
  ├── chat_llm            → comunicación con LLMs
  ├── search_web          → búsqueda web
  ├── extract_entities    → NER para grafo de conocimiento
  └── ping_llm            → health check
```

### Flujo del Agente de Código

```
Usuario: "Crea una landing page responsiva"
  │
  ▼
start_generation → LLM (sidecar) genera plan JSON
  │
  ▼
Plan mostrado al usuario (resumen + archivos + riesgo)
  │
  ├── Editar instrucciones → reinicia generación con nuevo prompt
  ├── Cancelar → vuelve a idle
  └── Aprobar → approve_plan escribe archivos en disco
       │
       └── Si hay archivos existentes → banner de permiso (Permitir / Denegar)
```

### Principios del Sistema

- **Offline-first:** Ollama + SQLite + ChromaDB permiten operar sin internet.
- **Multi-LLM:** el proveedor de IA se cambia sin reiniciar.
- **Trazabilidad:** cada operación conserva `trace_id` para auditoría.
- **MCP-extensible:** nuevas herramientas se conectan como servidores MCP.
- **Seguridad:** keys en keychain, allowlist localhost, tokens OAuth.

---

## Instalación

### Requisitos

- **Windows 10/11** (64 bits)
- **Git**
- **Node.js 18+** y **pnpm**
- **Rust toolchain** (https://rustup.rs)
- **Python 3.10+** con `pip`
- **(Opcional)** Ollama o LM Studio para IA local

### Pasos

```powershell
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/GeoNexus.git
cd GeoNexus

# 2. Instalar dependencias del frontend
pnpm install

# 3. Instalar dependencias Python (sidecar)
pip install -r ai/requirements.txt

# 4. Iniciar en modo desarrollo
pnpm tauri dev

# 5. Compilar para producción
pnpm tauri build
```

El binario compilado se genera en `src-tauri/target/release/`.

### Vista previa web (sin Tauri)

```powershell
pnpm dev
# Abre http://localhost:1420
# Nota: las funciones Tauri (archivos, BD) no estarán disponibles
```

---

## Configuración de LLM

La aplicación detecta automáticamente los modelos disponibles de:

| Proveedor | Tipo | URL por defecto |
|-----------|------|----------------|
| Ollama | Local | `http://localhost:11434` |
| LM Studio | Local | `http://localhost:1234` |
| OpenAI | Cloud | `https://api.openai.com/v1` |
| Anthropic | Cloud | `https://api.anthropic.com` |
| OpenRouter | Cloud | `https://openrouter.ai/api/v1` |

La configuración del proveedor activo se gestiona desde el panel de conectores en la interfaz y se persiste en `localStorage` (no en la base de datos).

---

## Estado del Proyecto

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
| Agente de código con plan-review | ✅ Completo |
| Carga y análisis de proyectos existentes | ✅ Completo |
| Sistema de razonamiento visual | ✅ Completo |
| Integración Telegram | ✅ Completo |

60+ comandos Tauri · 12 tablas SQLite · 81 tests Rust · 62 tests TypeScript

---

## Licencia

Uso interno — GeoNexus
