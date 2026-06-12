# Geo Agents

**Geo Agents** es una plataforma de agentes IA para análisis geoespacial, consulta normativa, documentos técnicos y herramientas GIS conectadas. Cada agente es un módulo independiente que puede ejecutar tareas específicas usando LLMs, MCP servers y datos locales o en la nube.

## Objetivo

Unificar la consulta de información territorial (normas POT, capas GIS, documentos técnicos, datos estructurados) en un solo entorno desktop donde el usuario conversa con agentes IA especializados que orquestan herramientas, recuperan contexto y producen respuestas trazables.

## Agentes

| Agente | Función |
|---|---|
| **Planner Agent** | Orquesta la solicitud del usuario y delega a los agentes especializados. |
| **GIS Agent** | Visualiza capas, ejecuta buffer, distancia, heatmap, clustering sobre QGIS/ArcGIS. |
| **Research Agent** | Busca en documentos, web, OneDrive, SharePoint y fuentes externas. |
| **Data Agent** | Analiza CSV, Excel, bases SQL y produce reportes estructurados. |
| **Document Agent** | Indexa PDFs, DOCX, contratos e informes para consulta con citas. |
| **Coding Agent** | Lee repositorios, ejecuta herramientas MCP y asiste en desarrollo. |

## Funciones principales

| Función | Agente | Descripción |
|---|---|---|
| Chat IA | Planner | Conversación con agentes, envío de archivos, ejecución de tools. |
| Mapa | GIS | Visualización de capas geográficas y resultados de análisis. |
| Documentos | Document | Subida, conexión e indexación de PDFs, DOCX, DXF, GeoJSON. |
| Grafo | — | Red de conocimiento que relaciona documentos, normas, zonas y capas. |
| Datos | Data | Gestión de capas, proyectos, tablas y registros estructurados. |
| Conectores | — | Fuentes externas: OneDrive, SharePoint, Google Drive, S3, Local. |
| Servidores MCP | — | Herramientas externas: QGIS MCP, Memory MCP, AI MCP, ArcGIS MCP. |
| Multi-LLM | Todos | Conexión a Ollama, LM Studio, OpenRouter, OpenAI, Anthropic. |

## Arquitectura

```
Usuario
  └→ Planner Agent
       ├→ GIS Agent      (QGIS MCP, ArcGIS MCP, GeoPandas)
       ├→ Research Agent (Web, PDFs, OneDrive, SharePoint)
       ├→ Data Agent     (CSV, Excel, SQL, Power BI)
       ├→ Document Agent (Word, PDF, contratos)
       └→ Coding Agent   (GitHub, VS Code, MCP, repos)
            └→ LLM Router → ChromaDB / Knowledge Graph
                 └→ MCP Router → MCP Servers
```

Principios del sistema:

- **Offline-first:** Ollama, LM Studio, SQLite, ChromaDB permiten operar sin internet.
- **Multi-LLM:** el proveedor de IA se cambia sin reiniciar el sistema.
- **Multi-mapa:** ArcGIS JS, MapLibre GL, Leaflet y Deck.gl.
- **MCP-extensible:** las herramientas se conectan como servidores MCP sin recompilar el core.
- **Seguridad por defecto:** keys en keychain, allowlist localhost, tokens HMAC.
- **Trazabilidad:** cada tool-call conserva `trace_id`, servidor, duración y resultado.

## Stack técnico

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Radix UI.
- **Desktop:** Tauri 2.
- **Rust:** crates modulares para core, MCP, DB y shell Tauri.
- **Python:** LLM Router, GeoPandas, Shapely, ChromaDB.
- **Base de datos:** SQLite + ChromaDB.
- **IA local:** Ollama y LM Studio.
- **IA cloud:** OpenRouter, OpenAI, Anthropic.

## Comandos

```powershell
pnpm install          # Instalar dependencias
pnpm run dev          # Frontend en desarrollo
pnpm run build        # Compilar frontend
pnpm run tauri:dev    # Ejecutar con Tauri
pnpm run tauri:build  # Build desktop
```

## Roadmap

| Versión | Enfoque |
|---|---|
| V1 | Chat IA, mapas, documentos, QGIS MCP, Memory MCP, arquitectura local-first. |
| V1.1 | Heatmaps avanzados, clustering y exportación PDF/DXF. |
| V1.2 | Grafo de conocimiento interactivo con relaciones norma-zona. |
| V1.3 | Sincronización ArcGIS Online / Portal y WMS/WFS. |
| V2 | Flujos multi-agente para análisis y reportes. |
| V3 | Planner Agent + agentes especializados (GIS, Research, Data, Document, Coding). |
