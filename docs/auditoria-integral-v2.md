# Auditoría Integral GeoNexus v2 — Junio 2026

## Resumen Ejecutivo

GeoNexus ha progresado significativamente desde la auditoría anterior. Se corrigieron bugs críticos de MCP (handshake duplicado, typo en pinger.rs), se refactorizó `useChatSession.ts` de 628→103 líneas, se implementaron 25 migraciones SQL formales, y se construyó un WorkerPool funcional con EventBus. Sin embargo, persisten problemas arquitectónicos profundos: vulnerabilidad SSRF crítica en MCP, 3/4 workers son stubs, embeddings Python son determinísticos (no semánticos), y el frontend tiene ~90% del código sin pruebas.

---

## 1. Progreso vs Auditoría Anterior

| Hallazgo Anterior | Estado Actual | Severidad |
|---|---|---|
| useChatSession.ts monolito (628L) | **REFACTORIZADO** → 103L + 4 hooks | ✅ |
| MCP handshake duplicado (4 impls) | **CORREGIDO** → handshake.rs compartido | ✅ |
| pinger.rs typo "2025-03-26}" | **CORREGIDO** → "2025-03-26" en constants.rs | ✅ |
| Sin migraciones SQL formales | **CORREGIDO** → 25 migrations | ✅ |
| AgentTrait/Registry codigo muerto | **ELIMINADO** → WorkerPool real existe | ✅ |
| EventBus sin implementacion | **CORREGIDO** → EventBus con publish+emit+persist | ✅ |
| API keys en localStorage | **PERSISTE** → Sin stronghold implementado | 🔴 |
| SSRF via MCP URLs | **PERSISTE** → auto_discover_tools sin validacion | 🔴 |
| Telegram roto (sin listener) | **PERSISTE** → Frontend listener sigue sin implementar | 🔴 |
| GIS no existe | **PERSISTE** → Placeholders | 🔴 |
| Tests insuficientes | **MEJORADO PARCIAL** → 273 tests Rust, 11 TS | 🟡 |
| Python sidecar CLI overhead | **PERSISTE** → Cada llamada lanza subproceso | 🔴 |

---

## 2. Frontend — Hallazgos Detallados

### 2.1 Organización de Componentes

**Problema:** 55 archivos planos en `src/components/chat/` sin subdirectorios.

```
src/components/chat/
├── AgentCleanupReport.tsx      ← debería ir a coding-agent/
├── AgentCodeViewer.tsx         ← debería ir a coding-agent/
├── AgentFileTree.tsx           ← debería ir a coding-agent/
├── AgentFileWritingCard.tsx    ← debería ir a coding-agent/
├── AgentLifeIndicator.tsx      ← debería ir a coding-agent/
├── AgentModeToggle.tsx         ← debería ir a coding-agent/
├── AgentPreview.tsx            ← debería ir a coding-agent/
├── AgentProjectDropzone.tsx    ← debería ir a coding-agent/
├── AgentStepsAccordion.tsx     ← debería ir a coding-agent/
├── AgentTimeline.tsx           ← debería ir a coding-agent/
├── CodingAgentPanel.tsx        ← debería ir a coding-agent/
├── ConnectorConnectionDialog.tsx  ← debería ir a connectors/
├── ConnectorMiniPanel.tsx         ← debería ir a connectors/
├── ConnectorStatusBadge.tsx       ← debería ir a connectors/
├── ShapefileConnectorDialog.tsx   ← debería ir a connectors/
├── McpConnectCard.tsx          ← debería ir a mcp/
├── McpToolCallCard.tsx         ← debería ir a mcp/
└── ... (38 otros archivos)
```

**Recomendación:** Crear subdirectorios `coding-agent/`, `connectors/`, `mcp/`, `common/`.

### 2.2 Tipos Duplicados

| Tipo | Archivo 1 | Archivo 2 | Acción |
|---|---|---|---|
| `FileNode` | `types/coding-agent.ts` | `ide/ide-types.ts` | **Unificar** — mismo modelo conceptual |
| `AgentPlan` | `types/agents.ts` | `types/coding-agent.ts` | **Renombrar** → `CodingAgentPlan` |
| `AgentEvent` | `types/agents.ts` | `types/coding-agent.ts` | **Renombrar** → `CodingAgentEvent` |
| `GraphNode` | `data.ts` (BackendGraphNode) | `data.ts` (GraphNode) | **Consolidar** — `kind` vs `type` |

### 2.3 Diálogos Duplicados

`ModelSettingsDialogs.tsx` (configuration/, 183L) y `ProviderSetupDialog.tsx` (ai-containers/, 452L) sirven al mismo propósito. `ProviderSetupDialog` tiene mejor UX (test de conexión, combobox de modelos, live fetch). **Eliminar** `ModelSettingsDialogs` y redirigir a `ProviderSetupDialog`.

### 2.4 Datos Demo en Producción

- **`useReasoningTimeline.ts`** (425L): 192 líneas de `simulateTimeline()` con datos hardcodeados ("App de Inventario", pasos falsos). Se activa por defecto cuando no hay `sessionId`.
- **`WorkspaceIDE.tsx`** (528L): `sampleFileTree` con datos demo inline.

### 2.5 workspace-data.ts: Tipos Mezclados con Constantes

Contiene definiciones de tipos (`NavItem`, `AiConnector`, `GisTool`) Y datos hardcodeados (`navigationItems`, `systemItems`, `gisTools`, `themePresets`, `activeAssistant`). Arrays zombies: `recentProjects: []`, `aiConnectors: []`, `recentAnalyses: []`.

---

## 3. Backend Rust — Hallazgos Detallados

### 3.1 Vulnerabilidad SSRF — CRÍTICA

**Archivo:** `crates/geonexus-mcp/src/registry.rs`

```rust
pub async fn auto_discover_tools(pool, server_url: &str, ...) {
    let endpoint = handshake::build_base_url(server_url);  // Sin validacion
    let client = handshake::build_client(10)?;
    handshake::do_handshake(&client, &endpoint, auth_token).await?; // Peticion HTTP arbitraria
}
```

`build_base_url` solo antepone `http://` si no hay scheme. **No valida IPs.** Un atacante puede apuntar a `http://127.0.0.1:11434` (Ollama local), `http://169.254.169.254` (metadata cloud), o cualquier IP interna.

**Mismo problema en `preview_http_tools` (registry.rs:439).**

### 3.2 Rate Limiting no Enforced

Campo `rate_limit` en `mcp_allowlist` se almacena pero NUNCA se verifica en `check_allowlist()`. Solo se usa en `executor.rs` para controlar frecuencia de llamadas a tools individuales, no para limitar recursos generales.

### 3.3 Workers: 3/4 son Stubs

| Worker | Estado | Implementación |
|---|---|---|
| `IndexerWorker` | ✅ Completo | Cambia estados en SQLite |
| `EmbedderWorker` | ❌ Stub | `// TODO: Implementar embedding real via sidecar` |
| `GraphWorker` | ❌ Stub | `// TODO: Implementar mantenimiento de grafo real` |
| `ClassifierWorker` | ❌ Stub | `// TODO: Implementar clasificacion real de assets` |

### 3.4 Dual EventBus sin Migración Clara

Coexisten `EventBus::publish()` (BusEvent legacy) y `EventBus::emit()` (GeoEvent nuevo). Ambos se escriben a SQLite pero en tablas diferentes. `start_event_forwarder` ignora errores de persistencia silenciosamente.

### 3.5 Sin Índices en Tablas Grandes

Tablas como `mcp_tool_calls`, `events`, `messages` no tienen índices explícitos en las migraciones. Con uso intensivo (>100 consultas/minuto), SQLite mostrará degradación.

### 3.6 Pruezas Faltantes en Rust

| Módulo | Tests | Cobertura |
|---|---|---|
| MCP registry.rs | **0** | check_allowlist, audit, rate_limit |
| Workers (concretos) | **0** | IndexerWorker, EmbedderWorker, etc. |
| Event commands | **0** | start_event_forwarder, list_events |
| MCP executor.rs | **0** | call_tool logic |
| **Total** | **273 tests** | Mayormente unitarios, pocos de integración |

---

## 4. Python Sidecar — Hallazgos Detallados

### 4.1 Embeddings Falsos (Determinísticos)

**Archivo:** `ai/memory/embeddings.py`

```python
def get_deterministic_embedding(text: str) -> list[float]:
    hash_obj = hashlib.sha256(text.encode())
    seed = struct.unpack('>I', hash_obj.digest()[:4])[0]
    rng = random.Random(seed)
    return [rng.random() for _ in range(384)]
```

Esto NO es un embedding semántico. Textos similares semánticamente tendrán vectores completamente diferentes. La "búsqueda semántica" con ChromaDB usando estos embeddings es efectivamente búsqueda por hash — no encuentra significado.

### 4.2 ChromaDB Mock Silencioso

**Archivo:** `ai/memory/chroma.py`

```python
class MockChromaCollection:
    """Mock que almacena en archivos JSON cuando chromadb no esta instalado."""
```

Si `chromadb` no está instalado (común en entornos sin GPU), el sidecar cae silenciosamente a almacenamiento JSON con búsqueda O(n). Sin logging, sin warning al usuario.

### 4.3 Sidecar CLI: Startup Overhead en Cada Llamada

Cada operación Python paga ~200-500ms de startup. Para operaciones frecuentes como `recall_chunks` o `chat_llm_stream`, esto es inaceptable. **Solución:** Migrar a FastAPI persistente.

### 4.4 API Keys en Variables de Entorno

`OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `ANTHROPIC_API_KEY` se leen de `os.getenv()`. El mecanismo para pasarlas al sidecar es frágil.

### 4.5 Cero Tests en Python

De 24 archivos `.py`, **ninguno tiene pruebas**. Cero cobertura en el pipeline de indexación, embeddings, extracción de grafos, o routing LLM.

---

## 5. Arquitectura MCP — Evaluación

### 5.1 Fortalezas
- ✅ **handshake.rs compartido** — todas las operaciones MCP usan el mismo módulo
- ✅ **constants.rs** con versión de protocolo correcta
- ✅ **Auditoría de tool calls** implementada (tabla `mcp_tool_calls`)
- ✅ **Security guards** en FS-MCP: `path_guard`, `confirm_gate`, `rate_guard`, `level_guard`
- ✅ **Soporte multi-transporte**: HTTP, STDIO, SSE

### 5.2 Debilidades
- 🔴 **SSRF sin protección** en auto_discover_tools y preview_http_tools
- 🔴 **Rate limiting no enforced** — campo muerto en la BD
- 🔴 **Sin timeout configurable por servidor** — hardcoded 10s/30s
- 🔴 **Sin límite de procesos STDIO concurrentes** — riesgo de fork bomb
- 🔴 **Sin negociación de versión de protocolo** — usa siempre "2025-03-26"
- 🔴 **Sin caché de tools descubiertas** — rediscovery en cada ping
- 🔴 **Sin tests** — registry.rs, executor.rs, pinger.rs sin cobertura

---

## 6. Sistema de Memoria y Almacenamiento

### 6.1 Estado Actual
- **ChromaDB** con embeddings falsos (determinísticos vía SHA-256)
- **SQLite** como DB relacional (12+ tablas)
- **Sin jerarquía de memoria** — Session/Project/Global no existe
- **Graph + ChromaDB desincronizados** — sin foreign keys cross-DB
- **Memoria efímera** no existe — todo persiste inmediatamente

### 6.2 Problemas
1. `compute_memory_score()` recorre TODOS los nodos (`SELECT * FROM graph_nodes`)
2. Extracción de entidades es regex básica, no NER con modelos
3. Sin caché de consultas frecuentes
4. Sin reducción de tokens (context window optimization)

---

## 7. Arquitectura Objetivo

```
┌──────────────────────────────────────────────────────────────────┐
│                    GEONEXUS V3                                     │
│             Conversational AI Workspace                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────┐  ┌──────────────────────────────┐  │
│  │    FRONTEND (React 18)    │  │   LAYERS                    │  │
│  │                           │  │                              │  │
│  │  ┌────────────────────┐  │  │  Presentation (components)   │  │
│  │  │ Chat Panel (centro)│  │  │  Domain (hooks, types)       │  │
│  │  │ Context Panel      │  │  │  API (api/*.ts)              │  │
│  │  │ Output Panel       │  │  │  IPC (Tauri invoke)          │  │
│  │  │ Tool Panel         │  │  └──────────────────────────────┘  │
│  │  └────────────────────┘  │                                    │
│  └──────────┬───────────────┘                                    │
│             │ Tauri IPC (invoke + events)                        │
│  ┌──────────▼───────────────┐                                    │
│  │    RUST BACKEND           │                                    │
│  │                           │                                    │
│  │  ┌─────────────────────┐  │  ┌────────────────────────────┐  │
│  │  │ Pipeline Router      │  │  │ Chat Service              │  │
│  │  │ → Intent Classifier  │  │  │ → Pipeline orchestration  │  │
│  │  │ → Context Builder    │  │  │ → Event streaming         │  │
│  │  │ → Worker Dispatcher  │  │  │ → Tool execution          │  │
│  │  └─────────────────────┘  │  └────────────────────────────┘  │
│  │                           │                                   │
│  │  ┌─────────────────────┐  │  ┌────────────────────────────┐  │
│  │  │ Memory Service       │  │  │ MCP Gateway V2            │  │
│  │  │ → Session Memory     │  │  │ → SSRF Guard             │  │
│  │  │ → Project Memory     │  │  │ → Rate Limiting          │  │
│  │  │ → Global Memory      │  │  │ → Schema Validation      │  │
│  │  │ → Cache (in-memory)  │  │  │ → Audit & Permissions    │  │
│  │  └─────────────────────┘  │  └────────────────────────────┘  │
│  │                           │                                   │
│  │  ┌─────────────────────┐  │  ┌────────────────────────────┐  │
│  │  │ Worker Pool (Tokio)  │  │  │ Event Bus                  │  │
│  │  │ → CodeGen Worker    │  │  │ → Domain events           │  │
│  │  │ → RAG Worker        │  │  │ → Frontend forwarding     │  │
│  │  │ → WebSearch Worker  │  │  │ → Persistence             │  │
│  │  │ → GIS Worker        │  │  │ → Replay support          │  │
│  │  │ → Telegram Worker   │  │  └────────────────────────────┘  │
│  │  └─────────────────────┘  │                                   │
│  └──────────┬───────────────┘                                    │
│             │ HTTP (persistente, no CLI)                         │
│  ┌──────────▼───────────────┐                                    │
│  │    PYTHON SIDECAR V2      │                                    │
│  │    (FastAPI persistente)  │                                    │
│  │                           │                                    │
│  │  ┌─────────────────────┐  │  ┌────────────────────────────┐  │
│  │  │ Embedding Service    │  │  │ LLM Router                 │  │
│  │  │ → sentence-transform │  │  │ → 5 providers             │  │
│  │  │ → BGE reranking      │  │  │ → Streaming               │  │
│  │  │ → Cache embeddings   │  │  │ → Fallback chain          │  │
│  │  └─────────────────────┘  │  └────────────────────────────┘  │
│  │                           │                                   │
│  │  ┌─────────────────────┐  │  ┌────────────────────────────┐  │
│  │  │ Indexing Pipeline    │  │  │ NER Service                │  │
│  │  │ → Extract → Chunk   │  │  │ → spaCy/GLiNER             │  │
│  │  │ → Embed → Store     │  │  │ → Graph update             │  │
│  │  └─────────────────────┘  │  └────────────────────────────┘  │
│  └───────────────────────────┘                                   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │              DATA LAYER                                    │    │
│  │  SQLite (relational) │ LanceDB (vector) │ Redis (cache)   │    │
│  │  Filesystem (proj.)  │ MCP Servers (externos)             │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 8. Roadmap de Transformación

### Fase 0 — Correcciones Críticas (Semana 1, ~20h)

| # | Tarea | Esfuerzo | Impacto |
|---|---|---|---|
| P0 | SSRF Guard: validar IPs en auto_discover_tools y preview_http_tools | 4h | Elimina vulnerabilidad crítica |
| P0 | Enforce rate limiting en executor.rs | 3h | Evita abuso de MCP |
| P0 | Migrar API keys de localStorage a stronghold | 8h | Elimina exposición de credenciales |
| P0 | Eliminar datos demo de useReasoningTimeline.ts | 2h | Limpia producción |
| P0 | Eliminar datos demo de WorkspaceIDE.tsx | 2h | Limpia producción |

### Fase 1 — Deuda Técnica (Semanas 2-3, ~60h)

| # | Tarea | Esfuerzo |
|---|---|---|
| P1 | Reemplazar ModelSettingsDialog con ProviderSetupDialog | 4h |
| P1 | Unificar tipos FileNode, AgentPlan, AgentEvent | 3h |
| P1 | Reorganizar src/components/chat/ en subdirectorios | 4h |
| P1 | Separar workspace-data.ts: types/ → tipos, datos → backend | 4h |
| P1 | Implementar EmbedderWorker real (via sidecar HTTP) | 8h |
| P1 | Implementar GraphWorker real (NER + graph update) | 8h |
| P1 | Implementar ClassifierWorker real | 6h |
| P1 | Agregar índices SQLite a tablas grandes | 2h |
| P1 | Tests para MCP registry.rs, executor.rs | 12h |
| P1 | Tests para workers pool | 6h |

### Fase 2 — Transformación Sidecar (Semanas 4-5, ~40h)

| # | Tarea | Esfuerzo |
|---|---|---|
| P2 | Migrar sidecar CLI a FastAPI persistente | 20h |
| P2 | Reemplazar embeddings determinísticos con sentence-transformers | 8h |
| P2 | Reemplazar ChromaDB mock con ChromaDB real o LanceDB | 8h |
| P2 | Agregar tests Python (pytest) | 12h |

### Fase 3 — Memoria y Contexto (Semanas 6-8, ~60h)

| # | Tarea | Esfuerzo |
|---|---|---|
| P3 | Memory Router: Session/Project/Global | 12h |
| P3 | Caché en memoria (HashMap con TTL) | 4h |
| P3 | RAG con reranking (BAAI/bge-reranker-v2-m3) | 12h |
| P3 | Query expansion + multi-vector + RRF fusion | 8h |
| P3 | Context window optimization (presupuesto de tokens) | 8h |
| P3 | Graph incremental update (score decay, BFS) | 8h |

### Fase 4 — MCP Gateway V2 (Semanas 9-10, ~40h)

| # | Tarea | Esfuerzo |
|---|---|---|
| P4 | MCP Gateway con SSRF Guard + Rate Limiting + Audit | 12h |
| P4 | Timeout configurable por servidor | 4h |
| P4 | Límite de procesos STDIO concurrentes | 4h |
| P4 | Cache de tools descubiertas | 6h |
| P4 | Dashboard de monitoreo MCP | 8h |

### Fase 5 — Agentes y Workers (Semanas 11-12, ~40h)

| # | Tarea | Esfuerzo |
|---|---|---|
| P4 | Pipeline Router en Rust (intent → worker dispatch) | 12h |
| P4 | CodeGen Worker (reemplazar coding_agent.py) | 12h |
| P4 | GIS Worker (wrapper GDAL/OGR) | 8h |
| P4 | Telegram Worker (reemplazar polling Rust) | 8h |

### Fase 6 — Plataforma (Meses 4-6, ~80h)

| # | Tarea | Esfuerzo |
|---|---|---|
| P5 | GIS MCP Server (QGIS bridge + GDAL) | 24h |
| P5 | GitHub MCP Server | 12h |
| P5 | OneDrive MCP Server (OAuth real) | 20h |
| P5 | Plugins SDK para skills de terceros | 40h |

---

## 9. Costo Técnico Total

| Fase | Horas | Días (8h) | Devs |
|---|---|---|---|
| F0 — Correcciones críticas | 20h | 2.5 | 1 |
| F1 — Deuda técnica | 60h | 7.5 | 1-2 |
| F2 — Sidecar v2 | 40h | 5 | 1 |
| F3 — Memoria y contexto | 60h | 7.5 | 1-2 |
| F4 — MCP Gateway | 40h | 5 | 1 |
| F5 — Agentes/Workers | 40h | 5 | 1 |
| F6 — Plataforma | 80h | 10 | 2 |
| **TOTAL** | **340h** | **42.5** | **1-2** |

---

## 10. Conclusión

GeoNexus tiene una base sólida pero necesita una transformación dirigida:

**LO QUE FUNCIONA BIEN:**
- Arquitectura Tauri 2 + Rust + React 18
- Sistema de migraciones SQL formal (25 archivos)
- MCP handshake compartido y correcto
- WorkerPool funcional con EventBus
- FS-MCP con security guards (path, rate, confirm, level)
- UI sólida con shadcn/ui, temas, tipado fuerte

**LO QUE DEBE CAMBIAR INMEDIATAMENTE:**
1. SSRF Guard en MCP (vulnerabilidad CRÍTICA)
2. Enforce rate limiting en MCP
3. Stronghold para API keys
4. Embeddings reales (no determinísticos)
5. Sidecar persistente (FastAPI, no CLI)

**LO QUE DEBE CONSTRUIRSE:**
1. Memory Router (Session/Project/Global)
2. RAG con reranking y query expansion
3. MCP Gateway centralizado con permisos
4. Workers reales (Embedder, Graph, Classifier)
5. GIS como MCP Server

**DECISIÓN ARQUITECTÓNICA CLAVE:**
GeoNexus DEBE ser un **Conversational AI Workspace** (chat céntrico + paneles contextuales), no un IDE, no una plataforma GIS tradicional. El chat es el centro; GIS, coding, MCP son herramientas invocadas desde el chat via workers y MCP servers.
