import {
  BotIcon,
  BrainCircuitIcon,
  BarChart3Icon,
  CloudIcon,
  DatabaseIcon,
  FileTextIcon,
  FlameIcon,
  GitBranchIcon,
  LayersIcon,
  MapIcon,
  MousePointer2Icon,
  NetworkIcon,
  RulerIcon,
  ServerIcon,
  Settings2Icon,
  SparklesIcon,
  TerminalIcon,
  WaypointsIcon,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

export type NavItem = {
  title: string
  url: string
  icon: LucideIcon
  isActive?: boolean
}

export type RecentProject = {
  name: string
  layers: number
  analyses: number
  active?: boolean
}

export type AiConnector = {
  id: string
  name: string
  provider: "local" | "cloud" | "mcp"
  role: "chat" | "embedding" | "tool-router" | "memory"
  status: "online" | "offline" | "needs-key"
  model: string
  models: string[]
  endpoint: string
  supportsTools: boolean
  privacy: "local" | "keychain" | "localhost"
  latency: string
  description: string
  icon: LucideIcon
}

export type GisTool = {
  name: string
  server: string
  description: string
  icon: LucideIcon
  status: "ready" | "disabled" | "needs-layer"
}

export type ThemePreset = {
  id:
    | "geo-dark"
    | "geo-light"
    | "emerald"
    | "cobalt"
    | "midnight"
    | "lagoon"
    | "graphite"
    | "terra"
  name: string
  description: string
  swatch: string
  tone: string
}

export type AnalysisItem = {
  name: string
  tool: string
  provider: string
  traceId: string
  status: "completed" | "running" | "queued"
}

export const navigationItems: NavItem[] = [
  { title: "Mapa", url: "#mapa", icon: MapIcon },
  { title: "Chat IA", url: "#chat", icon: BotIcon, isActive: true },
  { title: "Documentos", url: "#documentos", icon: FileTextIcon },
  { title: "Grafo", url: "#grafo", icon: GitBranchIcon },
  { title: "Analisis", url: "#analisis", icon: BarChart3Icon },
  { title: "Datos", url: "#datos", icon: DatabaseIcon },
]

export const systemItems: NavItem[] = [
  { title: "Servidores MCP", url: "#mcp", icon: ServerIcon },
  { title: "Configuracion", url: "#configuracion", icon: Settings2Icon },
]

export const recentProjects: RecentProject[] = [
  { name: "POT Barranquilla 2024", layers: 12, analyses: 3, active: true },
]

export const aiConnectors: AiConnector[] = [
  {
    id: "ollama",
    name: "Ollama",
    provider: "local",
    role: "chat",
    status: "online",
    model: "llama3.1",
    models: ["llama3.1", "mistral", "qwen2", "phi3"],
    endpoint: "localhost:11434",
    supportsTools: true,
    privacy: "localhost",
    latency: "Local",
    description: "Proveedor local detectado automaticamente para chat y tool-calls.",
    icon: TerminalIcon,
  },
  {
    id: "lmstudio",
    name: "LM Studio",
    provider: "local",
    role: "chat",
    status: "offline",
    model: "OpenAI compatible",
    models: ["openai-compatible", "gguf-local"],
    endpoint: "localhost:1234/v1",
    supportsTools: true,
    privacy: "localhost",
    latency: "Local",
    description: "Servidor local compatible con OpenAI API cuando el usuario lo activa.",
    icon: TerminalIcon,
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    provider: "cloud",
    role: "chat",
    status: "needs-key",
    model: "claude / gpt / gemini",
    models: ["claude-3.5-sonnet", "gpt-4o", "gemini-1.5-pro"],
    endpoint: "openrouter.ai/api/v1",
    supportsTools: true,
    privacy: "keychain",
    latency: "Cloud",
    description: "Gateway multi-modelo; las keys van al keychain del sistema.",
    icon: CloudIcon,
  },
  {
    id: "nomic-embed",
    name: "Embeddings locales",
    provider: "local",
    role: "embedding",
    status: "online",
    model: "nomic-embed-text",
    models: ["nomic-embed-text"],
    endpoint: "localhost:11434",
    supportsTools: false,
    privacy: "localhost",
    latency: "Local",
    description: "Vectoriza POT, memorias y conocimiento GIS sin salir del equipo.",
    icon: BrainCircuitIcon,
  },
  {
    id: "memory-mcp",
    name: "Memory MCP",
    provider: "mcp",
    role: "memory",
    status: "online",
    model: "pot_normas + project_memory",
    models: ["pot_normas", "project_memory", "gis_knowledge"],
    endpoint: "localhost:7011",
    supportsTools: false,
    privacy: "local",
    latency: "MCP",
    description: "Recupera memoria semantica, normas POT y contexto del proyecto.",
    icon: NetworkIcon,
  },
]

export const gisTools: GisTool[] = [
  {
    name: "Buffer espacial",
    server: "qgis-mcp",
    description: "Genera zonas de influencia con radio configurable.",
    icon: MousePointer2Icon,
    status: "ready",
  },
  {
    name: "Medir distancia",
    server: "qgis-mcp",
    description: "Calcula distancia entre puntos o geometrias.",
    icon: RulerIcon,
    status: "ready",
  },
  {
    name: "Heatmap",
    server: "qgis-mcp",
    description: "Crea mapas de densidad para eventos geograficos.",
    icon: FlameIcon,
    status: "needs-layer",
  },
  {
    name: "Clustering espacial",
    server: "qgis-mcp",
    description: "Agrupa puntos por proximidad o atributos.",
    icon: WaypointsIcon,
    status: "needs-layer",
  },
  {
    name: "Consultar norma POT",
    server: "memory-mcp",
    description: "Recupera articulos normativos por zona o pregunta.",
    icon: BrainCircuitIcon,
    status: "ready",
  },
]

export const themePresets: ThemePreset[] = [
  {
    id: "geo-dark",
    name: "Geo Dark",
    description: "Interfaz oscura para analisis espacial y sesiones largas.",
    swatch: "bg-[#111611]",
    tone: "Operativo",
  },
  {
    id: "geo-light",
    name: "Geo Light",
    description: "Tema claro para lectura documental y presentacion.",
    swatch: "bg-[#f8fafc]",
    tone: "Oficina",
  },
  {
    id: "emerald",
    name: "Emerald",
    description: "Acento verde para planeacion territorial.",
    swatch: "bg-emerald-500",
    tone: "GIS",
  },
  {
    id: "cobalt",
    name: "Cobalt",
    description: "Acento azul para supervision de datos.",
    swatch: "bg-sky-500",
    tone: "Datos",
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Oscuro elegante con acento cyan para trabajo nocturno.",
    swatch: "bg-[#07111f]",
    tone: "Nocturno",
  },
  {
    id: "lagoon",
    name: "Lagoon",
    description: "Azules y verdes suaves para lectura tecnica y mapas.",
    swatch: "bg-teal-500",
    tone: "Fresco",
  },
  {
    id: "graphite",
    name: "Graphite",
    description: "Neutro moderno con contraste alto para paneles densos.",
    swatch: "bg-zinc-800",
    tone: "Pro",
  },
  {
    id: "terra",
    name: "Terra",
    description: "Tonos tierra sobrios para planeacion urbana y POT.",
    swatch: "bg-stone-500",
    tone: "Urbano",
  },
]

export const recentAnalyses: AnalysisItem[] = [
  {
    name: "Buffer 500m",
    tool: "buffer",
    provider: "Ollama",
    traceId: "trc-8f21",
    status: "completed",
  },
  {
    name: "Consulta POT",
    tool: "query_pot",
    provider: "Memory MCP",
    traceId: "trc-44ad",
    status: "completed",
  },
  {
    name: "Medicion vial",
    tool: "distance",
    provider: "QGIS MCP",
    traceId: "trc-91c0",
    status: "queued",
  },
]

export const layerLegend = [
  { label: "Uso residencial", color: "bg-emerald-500" },
  { label: "Uso comercial", color: "bg-sky-500" },
  { label: "Zona restriccion", color: "bg-orange-500" },
]

export const activeAssistant = {
  name: "GeoNexus IA",
  connector: "Ollama",
  model: "llama3.1",
  status: "online",
  insight:
    "Detecte 3 zonas de restriccion POT en el area seleccionada. La zona naranja tiene restriccion de altura maxima de 6m segun el art. 142.",
}

export const quickActions = [
  { label: "Ver norma completa", icon: FileTextIcon },
  { label: "Buffer 500m", icon: MousePointer2Icon },
  { label: "Exportar analisis", icon: SparklesIcon },
]
