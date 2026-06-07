import { Layers3Icon, MapIcon, MemoryStickIcon, type LucideIcon } from "lucide-react"

export type McpServerStatus = "online" | "degraded" | "offline" | "planned"

export type McpServer = {
  id: string
  name: string
  url: string
  status: McpServerStatus
  latency: string
  tools: number
  description: string
  icon: LucideIcon
}

export type McpTool = {
  name: string
  server: string
  category: "GIS" | "Memoria" | "IA" | "UI"
  args: string
  result: string
  status: "ready" | "guarded" | "planned"
}

export type McpTrace = {
  traceId: string
  tool: string
  server: string
  duration: string
  status: "ok" | "queued" | "blocked"
}

export const mcpServers: McpServer[] = [
  {
    id: "qgis-mcp",
    name: "QGIS MCP",
    url: "localhost:7021",
    status: "online",
    latency: "142 ms",
    tools: 5,
    description: "Procesamiento GIS complejo: buffers, distancia, capas, heatmaps y clustering.",
    icon: MapIcon,
  },
  {
    id: "memory-mcp",
    name: "Memory MCP",
    url: "localhost:7011",
    status: "online",
    latency: "38 ms",
    tools: 3,
    description: "Recupera normas POT, guarda contexto y consulta memoria semantica local.",
    icon: MemoryStickIcon,
  },
  {
    id: "arcgis-mcp",
    name: "ArcGIS MCP",
    url: "localhost:7041",
    status: "planned",
    latency: "-",
    tools: 0,
    description: "Sincronizacion futura con ArcGIS Online, Portal y servicios WMS/WFS externos.",
    icon: Layers3Icon,
  },
]

export const mcpTools: McpTool[] = [
  {
    name: "buffer",
    server: "qgis-mcp",
    category: "GIS",
    args: "geom, radius, unit",
    result: "GeoJSON con zona buffer",
    status: "ready",
  },
  {
    name: "distance",
    server: "qgis-mcp",
    category: "GIS",
    args: "point_a, point_b, unit",
    result: "Float con distancia",
    status: "ready",
  },
  {
    name: "load_layer",
    server: "qgis-mcp",
    category: "GIS",
    args: "path, format",
    result: "Layer metadata + features",
    status: "guarded",
  },
  {
    name: "heatmap",
    server: "qgis-mcp",
    category: "GIS",
    args: "points[], weight_field",
    result: "Raster GeoTIFF",
    status: "planned",
  },
  {
    name: "cluster",
    server: "qgis-mcp",
    category: "GIS",
    args: "points[], algorithm",
    result: "GeoJSON con clusters",
    status: "planned",
  },
  {
    name: "query_pot",
    server: "memory-mcp",
    category: "Memoria",
    args: "question, zone_id",
    result: "Texto normativo relevante",
    status: "ready",
  },
  {
    name: "store_context",
    server: "memory-mcp",
    category: "Memoria",
    args: "content, metadata",
    result: "ID del embedding",
    status: "ready",
  },
  {
    name: "recall",
    server: "memory-mcp",
    category: "Memoria",
    args: "query, top_k",
    result: "Lista de memorias relevantes",
    status: "ready",
  },
]

export const mcpTraces: McpTrace[] = [
  {
    traceId: "trc-8f21",
    tool: "buffer",
    server: "qgis-mcp",
    duration: "142 ms",
    status: "ok",
  },
  {
    traceId: "trc-44ad",
    tool: "query_pot",
    server: "memory-mcp",
    duration: "38 ms",
    status: "ok",
  },
  {
    traceId: "trc-91c0",
    tool: "distance",
    server: "qgis-mcp",
    duration: "queued",
    status: "queued",
  },
  {
    traceId: "trc-a12e",
    tool: "load_layer",
    server: "qgis-mcp",
    duration: "blocked",
    status: "blocked",
  },
]
