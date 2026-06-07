export type DataAssetStatus = "Indexado" | "Sincronizando" | "Pendiente" | "Conflicto"

export type DataAssetKind = "PDF" | "GIS" | "Excel" | "GeoJSON" | "Sync"

export type DataAsset = {
  id: string
  name: string
  kind: DataAssetKind
  source: string
  location: string
  status: DataAssetStatus
  updated: string
  size: string
  chunks: number
  embeddings: number
  graphNodes: number
  cacheState: string
  lineage: string[]
}

export type DataStoreMetric = {
  name: string
  role: string
  value: string
  detail: string
  status: "Activo" | "Simulado" | "Planeado"
}

export type SyncEvent = {
  id: string
  source: string
  operation: string
  status: "ok" | "queued" | "blocked"
  detail: string
  time: string
}

export const dataAssets: DataAsset[] = [
  {
    id: "asset-pot-baq",
    name: "POT Barranquilla 2024.pdf",
    kind: "PDF",
    source: "OneDrive",
    location: "/GeoNexus/POT/documentos",
    status: "Indexado",
    updated: "Hoy 10:45",
    size: "42.1 MB",
    chunks: 118,
    embeddings: 118,
    graphNodes: 24,
    cacheState: "Cache cifrado vigente",
    lineage: ["OneDrive", "Cache local", "Extractor PDF", "ChromaDB", "Knowledge Graph"],
  },
  {
    id: "asset-predios",
    name: "predios_zona_norte.geojson",
    kind: "GeoJSON",
    source: "OneDrive",
    location: "/GIS/capas",
    status: "Sincronizando",
    updated: "Hace 12 min",
    size: "18.4 MB",
    chunks: 36,
    embeddings: 36,
    graphNodes: 9,
    cacheState: "ETag remoto en validacion",
    lineage: ["OneDrive", "containers-mcp", "MapStore", "ChromaDB", "Grafo"],
  },
  {
    id: "asset-cartografia",
    name: "Anexos cartograficos.zip",
    kind: "GIS",
    source: "Carpeta local",
    location: "C:/GIS/Proyectos/POT",
    status: "Indexado",
    updated: "Ayer",
    size: "86.0 MB",
    chunks: 27,
    embeddings: 27,
    graphNodes: 11,
    cacheState: "Archivo local allowlist",
    lineage: ["Carpeta local", "Indexador GIS", "Capas", "Knowledge Graph"],
  },
  {
    id: "asset-resolucion",
    name: "Resolucion uso de suelo.docx",
    kind: "PDF",
    source: "SharePoint",
    location: "/Sites/Urbanismo/Normativa",
    status: "Pendiente",
    updated: "Ayer",
    size: "5.6 MB",
    chunks: 0,
    embeddings: 0,
    graphNodes: 0,
    cacheState: "Esperando OAuth",
    lineage: ["SharePoint", "OAuth", "Extractor DOCX", "ChromaDB"],
  },
]

export const dataStores: DataStoreMetric[] = [
  {
    name: "SQLite metadata",
    role: "Inventario, rutas, ETags y sync logs",
    value: "4 assets",
    detail: "Sin tokens; solo metadata operativa.",
    status: "Simulado",
  },
  {
    name: "Cache cifrado",
    role: "Archivos descargados para modo offline",
    value: "146 MB",
    detail: "AES-256-GCM, limite objetivo 5 GB.",
    status: "Simulado",
  },
  {
    name: "ChromaDB",
    role: "Embeddings y busqueda semantica",
    value: "181 vectores",
    detail: "Alimenta recall y respuestas citadas.",
    status: "Simulado",
  },
  {
    name: "Knowledge Graph",
    role: "Relaciones norma-zona-capa-documento",
    value: "44 nodos",
    detail: "Contexto relacional para GeoNexus IA.",
    status: "Simulado",
  },
]

export const syncEvents: SyncEvent[] = [
  {
    id: "sync-1",
    source: "OneDrive",
    operation: "container_search",
    status: "ok",
    detail: "predios_zona_norte.geojson encontrado e indexado.",
    time: "18:41",
  },
  {
    id: "sync-2",
    source: "SharePoint",
    operation: "container_list",
    status: "queued",
    detail: "Pendiente de OAuth para biblioteca Urbanismo.",
    time: "18:42",
  },
  {
    id: "sync-3",
    source: "Cache",
    operation: "etag_check",
    status: "ok",
    detail: "2 archivos vigentes, 1 archivo en validacion.",
    time: "18:44",
  },
  {
    id: "sync-4",
    source: "MCP",
    operation: "container_get",
    status: "blocked",
    detail: "Lectura bloqueada fuera de allowlist local.",
    time: "18:45",
  },
]
