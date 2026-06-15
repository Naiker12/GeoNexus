# GeoNexus - Contenido para Landing Page y Página de Documentación

## Landing Page - Secciones Principales

---

### 1. Hero Section

**Título**: GeoNexus  
**Subtítulo**: Plataforma de Agentes IA para Gestión de Conocimiento Territorial  
**Descripción**: Conversa con modelos locales o cloud, indexa documentos, explora un grafo de conocimiento y audita cada ejecución — todo en una sola app desktop.

**CTA Buttons**:
- [Descargar para Windows]
- [Ver Documentación]
- [GitHub]

**Características destacadas**:
- ✅ Offline-first (Ollama + SQLite + ChromaDB)
- ✅ Multi-LLM (5+ proveedores)
- ✅ Grafo de conocimiento automático
- ✅ RAG semántico con citas
- ✅ MCP extensible
- ✅ Trazabilidad completa

---

### 2. Características Principales

#### Chat IA Multimodelo
Conversa con modelos locales (Ollama, LM Studio) o cloud (OpenAI, Anthropic, OpenRouter). Soporta tool-calling, web search y @menciones de assets, conectores, nodos del grafo y skills.

#### Indexación Documental
Sube PDFs, DOCX, TXT y archivos técnicos. El sistema extrae texto, divide en chunks, genera embeddings y almacena en ChromaDB para búsqueda semántica RAG.

#### Grafo de Conocimiento
Red de nodos (documentos, entidades, conceptos) y aristas que se construye automáticamente al chatear e indexar. Visualización interactiva con d3-force, filtros por tipo y búsqueda.

#### Conectores de Datos
Conecta carpetas locales, OneDrive (próximamente Google Drive, SharePoint, Dropbox, S3). Cachea archivos y los indexa automáticamente.

#### Containers MCP
Sistema de herramientas MCP para operar archivos: listar, buscar, sincronizar y subir documentos desde conectores registrados. Audit trail completo de todas las llamadas.

#### Análisis y Métricas
Dashboard de uso: tokens por modelo, consultas top, skills usadas, costo estimado y trazas de ejecución con paginación. Exporta a CSV/JSON.

---

### 3. Cómo Funciona

#### Paso 1: Configura tu LLM
- Elige entre modelos locales (Ollama, LM Studio) o cloud (OpenAI, Anthropic, OpenRouter)
- Auto-detección de modelos disponibles
- Cambia de proveedor en caliente sin reiniciar

#### Paso 2: Indexa tus Documentos
- Sube PDFs, DOCX, TXT o conecta una carpeta
- El sistema extrae texto, genera embeddings y crea un grafo de conocimiento automáticamente
- Todo se almacena localmente en SQLite + ChromaDB

#### Paso 3: Chatea con tu Conocimiento
- Haz preguntas en lenguaje natural
- El sistema recupera chunks relevantes (RAG), injecta contexto del grafo y skills activos
- Obtén respuestas con citas verificables y trazas completas

#### Paso 4: Explora y Analiza
- Navega el grafo de conocimiento para ver conexiones
- Consulta métricas de uso y costo
- Audita todas las ejecuciones con trace_id único

---

### 4. Stack Tecnológico

| Capa | Tecnologías |
|------|-------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Radix UI, Lucide, Recharts |
| **Desktop** | Tauri 2 |
| **Backend Rust** | geonexus-core, geonexus-db (SQLite), geonexus-mcp, geonexus-tauri |
| **Sidecar Python** | ChromaDB, PyPDF, python-docx, geopandas, shapely |
| **Base de Datos** | SQLite + ChromaDB |
| **IA** | Ollama, LM Studio, OpenAI, Anthropic, OpenRouter |

---

### 5. Casos de Uso

#### Planificación Territorial
- Analiza POT/PBOT colombianos
- Consulta normativa aplicable a zonas específicas
- Genera informes técnicos con citas verificables

#### Gestión Documental
- Indexa toda tu documentación técnica
- Búsqueda semántica sobre miles de documentos
- Grafo de conocimiento para explorar relaciones entre conceptos

#### Análisis de Datos GIS
- Integra con QGIS y ArcGIS via MCP
- Consultas en lenguaje natural sobre capas geográficas
- Genera visualizaciones y mapas automáticamente

#### Auditoría y Compliance
- Trazabilidad completa de todas las ejecuciones
- Audit trail de herramientas MCP
- Exportación de trazas a CSV/JSON

---

### 6. Testimonios (Placeholder)

> "GeoNexus ha transformado cómo trabajamos con la normativa territorial. Ahora podemos consultar miles de documentos en segundos y obtener respuestas con citas verificables."  
> — Equipo de Planeación Urbana

> "El grafo de conocimiento es increíble. Vemos conexiones entre documentos que nunca hubiéramos descubierto manualmente."  
> — Analista de Datos GIS

---

### 7. Preguntas Frecuentes (FAQ)

#### ¿Es gratis?
GeoNexus es software de uso interno. Los modelos de IA cloud (OpenAI, Anthropic, etc.) tienen costos según su propio pricing. Los modelos locales (Ollama, LM Studio) son completamente gratuitos.

#### ¿Mis datos salen de mi equipo?
No si usas modelos locales. Todo se procesa localmente en tu equipo: SQLite, ChromaDB, Ollama/LM Studio. Si usas modelos cloud, solo se envía el prompt necesario para generar la respuesta.

#### ¿Qué formatos de documento soporta?
Actualmente PDFs, DOCX y TXT. Próximamente XLSX, CSV, GeoJSON y más.

#### ¿Cómo instalo modelos locales?
Instala Ollama (https://ollama.com) y descarga modelos como `llama3`, `mistral` o `gemma`. GeoNexus los detecta automáticamente.

#### ¿Puedo extender GeoNexus?
¡Sí! Usa el sistema de Skills para agregar instrucciones especializadas, o conecta tus propios servidores MCP para agregar herramientas personalizadas.

---

### 8. Footer

- [Descargar]
- [Documentación]
- [GitHub]
- [Contacto]
- [Términos de Uso]
- [Política de Privacidad]

---

## Página de Documentación - Estructura

### Sidebar Navigation

1. **Empezar**
   - Instalación
   - Quick Start
   - Configuración Inicial

2. **Guías**
   - Chat IA
   - Indexar Documentos
   - Grafo de Conocimiento
   - Conectores
   - MCP
   - Skills
   - Análisis

3. **Referencia API**
   - Comandos Tauri
   - Tipos TypeScript
   - Tipos Rust
   - Sidecar Python

4. **Arquitectura**
   - Visión General
   - Frontend
   - Backend Rust
   - Sidecar Python
   - Base de Datos

5. **Contribuir**
   - Guía de Contribución
   - Code Style
   - Tests

---

## Contenido para Documentación - Páginas Detalladas

### 1. Instalación
- Requisitos previos
- Paso a paso Windows
- Instalar Ollama (opcional)
- Instalar LM Studio (opcional)
- Verificar instalación

### 2. Quick Start
1. Abrir GeoNexus
2. Configurar LLM (Ollama recomendado para empezar)
3. Subir tu primer documento
4. Hacer tu primera pregunta
5. Explorar el grafo

### 3. Chat IA
- Interfaz del chat
- @mentions (qué son y cómo usarlos)
- /comandos disponibles
- Web search
- Context toggle
- Tool-calling
- Exportar chat

### 4. Indexar Documentos
- Formatos soportados
- Cómo subir documentos
- Cómo conectar una carpeta
- Pipeline de indexación
- Ver documentos indexados
- Reconstruir grafo de conocimiento

### 5. Grafo de Conocimiento
- Tipos de nodos
- Visualización interactiva
- Filtros y búsqueda
- Pin/merge/delete de nodos
- Nodos efímeros
- Uso en chat

### 6. Conectores
- Conector local (carpetas)
- OneDrive (próximamente)
- Google Drive (próximamente)
- SharePoint (próximamente)
- Dropbox (próximamente)
- S3 (próximamente)
- Sincronización y cache

### 7. MCP (Model Context Protocol)
- ¿Qué es MCP?
- Tipos de transporte (HTTP/Stdio/SSE)
- Registrar un servidor MCP
- Descubrir herramientas
- Llamar herramientas desde chat
- Audit trail
- Containers MCP (built-in)

### 8. Skills
- ¿Qué es un Skill?
- Estructura de SKILL.md
- Instalar skills (GitHub/archivo)
- Activar skills en chat
- Built-in skill: pot-analyzer
- Crear tu propio Skill

### 9. Análisis y Métricas
- Dashboard principal
- Tokens por modelo
- Consultas top
- Skills más usados
- Costo estimado
- Trazas de ejecución
- Exportar a CSV/JSON

---

## Palabras Clave para SEO

GeoNexus, IA territorial, agentes IA, conocimiento territorial, planificación urbana, POT, PBOT, chat IA, RAG, grafo de conocimiento, ChromaDB, SQLite, Tauri, Rust, React, Ollama, LM Studio, OpenAI, Anthropic, OpenRouter, MCP, Model Context Protocol, GIS, QGIS, ArcGIS, indexación de documentos, búsqueda semántica, offline-first, trazabilidad, auditoría.
