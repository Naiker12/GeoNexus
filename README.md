# GeoNexus

**GeoNexus** es una plataforma desktop de agentes IA para análisis de documentos, consulta normativa y gestión de conocimiento territorial. Conversa con modelos locales o cloud, indexa documentos, explora un grafo de conocimiento y audita cada ejecución.

---

## Objetivo

Unificar la consulta de información territorial (normas, documentos técnicos, capas GIS, datos estructurados) en un solo entorno desktop donde el usuario conversa con agentes IA que orquestan herramientas, recuperan contexto vectorial (RAG) y producen respuestas trazables con referencias.

---

## Funciones principales

| Función | Descripción |
|---------|-------------|
| **Chat IA** | Conversación contextual con modelos locales (Ollama, LM Studio) o cloud (OpenAI, Anthropic, OpenRouter). Soporta tool-calling, web search y @menciones. |
| **Indexación documental** | Sube PDFs, DOCX, TXT y archivos técnicos → extrae texto → chunkifica → genera embeddings → almacena en ChromaDB para búsqueda RAG. |
| **Grafo de conocimiento** | Red de nodos (documentos, entidades, conceptos) y aristas que se construye automáticamente al chatear e indexar. Visualización interactiva con zoom/arrastre. |
| **Conectores** | Fuentes de datos: carpetas locales, OneDrive (próximamente Google Drive, SharePoint, Dropbox, S3). Cachea archivos y los indexa. |
| **Containers MCP** | Sistema de herramientas MCP para operar archivos: listar, buscar, sincronizar y subir documentos desde conectores registrados. |
| **Análisis y métricas** | Dashboard de uso: tokens por modelo, consultas top, skills usadas, costo estimado y trazas de ejecución con paginación. |
| **Agentes de IA** | 5 agentes preconfigurados (Indexador, Embedder, Grafo, Clasificador, Chat IA) activables desde Configuración. |
| **Multi-LLM** | Cambia de proveedor IA en caliente: Ollama, LM Studio, OpenAI, OpenRouter, Anthropic. Detección automática de modelos. |
| **Actividad reciente** | Panel de trazas con paginación que muestra eventos de sincronización, descubrimiento e indexación en tiempo real. |
| **Notificaciones** | Sistema de notificaciones configurable por categoría y canal (toast, sistema, sonido). |

---

## Capturas

![GeoNexus](public/Geonexus.png)

---

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Radix UI, Lucide |
| Desktop | Tauri 2 |
| Backend Rust | geonexus-core, geonexus-db (SQLite), geonexus-mcp, geonexus-tauri |
| Sidecar Python | ChromaDB, extracción de texto, embeddings, búsqueda web, NER |
| Base de datos | SQLite (12 tablas) + ChromaDB (vectores) |
| IA local | Ollama, LM Studio |
| IA cloud | OpenAI, Anthropic, OpenRouter |

---

## Descarga e instalación

### Requisitos

- **Windows 10/11** (64 bits)
- **Git** (para clonar)
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

## Arquitectura

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

Principios del sistema:

- **Offline-first:** Ollama + SQLite + ChromaDB permiten operar sin internet.
- **Multi-LLM:** el proveedor de IA se cambia sin reiniciar.
- **Trazabilidad:** cada operación conserva `trace_id` para auditoría.
- **MCP-extensible:** nuevas herramientas se conectan como servidores MCP.
- **Seguridad:** keys en keychain, allowlist localhost, tokens OAuth.

---

## Estado del proyecto

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

56+ comandos Tauri · 12 tablas SQLite · 81 tests Rust · 62 tests TypeScript

---

## Licencia

Uso interno — GeoNexus
