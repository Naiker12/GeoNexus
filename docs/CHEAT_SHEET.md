# GeoNexus - Hoja de Referencia Rápida (Cheat Sheet)

## Comandos Rápidos

### Instalación y Ejecución
```powershell
# Instalar dependencias frontend
pnpm install

# Instalar dependencias Python
pip install -r ai/requirements.txt

# Dev mode (Tauri)
pnpm tauri:dev

# Dev mode (solo web, sin Tauri)
pnpm dev

# Build producción
pnpm tauri:build
```

### /comandos en Chat
| Comando | Descripción |
|---------|-------------|
| `/new-chat` | Inicia una nueva conversación |
| `/clear` | Limpia el chat actual |
| `/export` | Exporta el chat a markdown |
| `/use-graph` | Activa/desactiva contexto del grafo |
| `/mode-research` | Modo investigación (web search + RAG) |

### @mentions en Chat
| Tipo | Sintaxis | Ejemplo |
|------|----------|---------|
| Conector | `@connector:nombre` | `@connector:mi-carpeta` |
| Asset | `@asset:nombre` | `@asset:documento-pdf` |
| Nodo del Grafo | `@graph:nombre` | `@graph:zona-centro` |
| Skill | `@skill:nombre` | `@skill:pot-analyzer` |
| Agente | `@agent:nombre` | `@agent:indexador` |

## Estructura de SKILL.md
```markdown
---
name: nombre-del-skill
description: Descripción corta
version: 1.0.0
author: Tu Nombre
category: gis|research|data|agent|tool|connector
tags: [tag1, tag2, tag3]
mcp-servers: [server1, server2]
---

# Contenido del Skill
- Instrucciones para el LLM
- Reglas de formato
- Protocolos especiales
```

## Tipos de Nodos del Grafo
| Tipo | Icono/Color | Descripción |
|------|-------------|-------------|
| `norma` | 📜 Azul | Artículos, normativas |
| `documento` | 📄 Verde | Documentos indexados |
| `capa` | 🗺️ Naranja | Capas GIS |
| `zona` | 📍 Rojo | Zonas geográficas |
| `concepto` | 💡 Morado | Conceptos temáticos |
| `chat_turn` | 💬 Amarillo | Turnos de conversación |
| `web_search` | 🔵 Cyan | Resultados de búsqueda |
| `upload` | 📤 Gris | Archivos subidos |
| `connector` | 🔌 Rosa | Conectores de datos |
| `rag_recall` | 🔍 Marrón | Chunks recuperados |

## Proveedores LLM
| Proveedor | Tipo | Endpoint | API Key |
|-----------|------|----------|---------|
| Ollama | Local | `http://localhost:11434` | No |
| LM Studio | Local | `http://localhost:1234/v1` | No |
| OpenAI | Cloud | `https://api.openai.com/v1` | `OPENAI_API_KEY` |
| Anthropic | Cloud | `https://api.anthropic.com` | `ANTHROPIC_API_KEY` |
| OpenRouter | Cloud | `https://openrouter.ai/api/v1` | `OPENROUTER_API_KEY` |

## Rutas Principales (Frontend)
| Ruta | Página |
|------|--------|
| `#chat` | Chat IA (default) |
| `#documentos` | Documentos indexados |
| `#datos` | Assets y datos |
| `#conocimiento` | Grafo de conocimiento |
| `#uso` | Análisis y métricas |
| `#agentes` | Agentes de IA |
| `#skills` | Skills |
| `#mcp` | Servidores MCP |
| `#conectores` | Conectores de datos |
| `#contenedores-ia` | Contenedores IA |

## Estructura del Proyecto (Resumida)
```
GeoNexus/
├── src/                    # Frontend React/TypeScript
│   ├── components/         # Componentes UI
│   ├── features/           # Features principales
│   └── api/                # Wrappers Tauri invoke
├── crates/                 # Backend Rust
│   ├── geonexus-core/      # Tipos compartidos
│   ├── geonexus-db/        # SQLite + migraciones
│   ├── geonexus-mcp/       # MCP implementation
│   └── geonexus-tauri/     # Comandos Tauri
├── ai/                     # Python sidecar
│   ├── llm/                # Proveedores LLM
│   ├── memory/             # ChromaDB + embeddings
│   ├── docs/               # Lector/chunker de docs
│   └── graph/              # Grafo de conocimiento
└── docs/                   # Documentación
```

## Tips Útiles
1. **Offline-first**: Usa Ollama para funcionar sin internet
2. **Quick test**: Sube un PDF, indexa y haz una pregunta sobre él
3. **Explora el grafo**: Después de chatear, ve a `#conocimiento` para ver nodos nuevos
4. **Mide costo**: Usa la página `#uso` para ver tokens y costo estimado
5. **Extiende**: Crea un Skill para instrucciones especializadas

## Enlaces Útiles
- [Ollama](https://ollama.com)
- [LM Studio](https://lmstudio.ai)
- [Tauri 2](https://tauri.app)
- [ChromaDB](https://trychroma.com)
- [Model Context Protocol](https://modelcontextprotocol.io)
