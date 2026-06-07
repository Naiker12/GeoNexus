export type GraphNodeType = "norma" | "documento" | "capa" | "zona" | "concepto"

export type GraphNode = {
  id: string
  label: string
  type: GraphNodeType
  description: string
  evidence: string
  x: number
  y: number
  weight: number
}

export type GraphEdge = {
  source: string
  target: string
  relation: string
  strength: number
}

export type GraphCluster = {
  name: string
  count: number
  confidence: string
  summary: string
}

export type GraphInsight = {
  title: string
  detail: string
  impact: "Alta" | "Media" | "Baja"
}

export type GraphTrace = {
  step: string
  status: "Completo" | "En curso" | "Pendiente"
  detail: string
}

export const graphNodes: GraphNode[] = [
  {
    id: "pot-142",
    label: "Art. 142",
    type: "norma",
    description: "Restriccion de altura para zonas cercanas a corredores hidricos.",
    evidence: "POT Barranquilla 2024 / pagina 318",
    x: 42,
    y: 28,
    weight: 3,
  },
  {
    id: "zona-norte",
    label: "Zona norte",
    type: "zona",
    description: "Sector industrial con restricciones urbanisticas activas.",
    evidence: "Capa zonificacion_norte.geojson",
    x: 58,
    y: 42,
    weight: 4,
  },
  {
    id: "retiro-hidrico",
    label: "Retiro hidrico",
    type: "concepto",
    description: "Franja de proteccion obligatoria alrededor de canales y arroyos.",
    evidence: "Memoria tecnica ambiental / seccion 4.2",
    x: 36,
    y: 58,
    weight: 2,
  },
  {
    id: "dxf-catastro",
    label: "DXF Catastro",
    type: "documento",
    description: "Plano importado con predios, linderos y vias secundarias.",
    evidence: "catastro_sector_norte.dxf",
    x: 70,
    y: 64,
    weight: 2,
  },
  {
    id: "uso-industrial",
    label: "Uso industrial II",
    type: "norma",
    description: "Uso permitido bajo impacto con control de ruido y emisiones.",
    evidence: "POT Barranquilla 2024 / articulo 88",
    x: 24,
    y: 35,
    weight: 2,
  },
  {
    id: "capa-canales",
    label: "Canales",
    type: "capa",
    description: "Capa GIS de drenaje urbano usada para cruces espaciales.",
    evidence: "canales_principales.geojson",
    x: 50,
    y: 76,
    weight: 3,
  },
]

export const graphEdges: GraphEdge[] = [
  { source: "pot-142", target: "zona-norte", relation: "limita", strength: 92 },
  { source: "pot-142", target: "retiro-hidrico", relation: "define", strength: 88 },
  { source: "retiro-hidrico", target: "capa-canales", relation: "se calcula con", strength: 84 },
  { source: "zona-norte", target: "dxf-catastro", relation: "intersecta", strength: 79 },
  { source: "uso-industrial", target: "zona-norte", relation: "aplica en", strength: 86 },
  { source: "dxf-catastro", target: "capa-canales", relation: "cruza con", strength: 71 },
]

export const graphClusters: GraphCluster[] = [
  {
    name: "Normativa POT",
    count: 38,
    confidence: "94%",
    summary: "Articulos, usos del suelo, retiros, alturas y compatibilidades.",
  },
  {
    name: "Evidencia documental",
    count: 24,
    confidence: "89%",
    summary: "Paginas y secciones citables desde PDF, DXF y memorias tecnicas.",
  },
  {
    name: "Cruces GIS",
    count: 17,
    confidence: "82%",
    summary: "Relaciones entre capas, zonas, buffers y resultados de analisis.",
  },
]

export const graphInsights: GraphInsight[] = [
  {
    title: "La restriccion de altura depende del retiro hidrico",
    detail:
      "El Art. 142 no debe responderse solo por zona: necesita cruce con canales y distancia al eje hidrico.",
    impact: "Alta",
  },
  {
    title: "DXF Catastro aporta evidencia espacial incompleta",
    detail:
      "Faltan atributos de uso para 12 predios; conviene enriquecerlos con la capa de zonificacion.",
    impact: "Media",
  },
  {
    title: "Uso industrial II aparece como permiso condicionado",
    detail:
      "El grafo lo conecta con ruido, emisiones y vias de acceso, no como permiso absoluto.",
    impact: "Media",
  },
]

export const graphTrace: GraphTrace[] = [
  {
    step: "Documentos",
    status: "Completo",
    detail: "4 fuentes leidas y 187 chunks disponibles.",
  },
  {
    step: "Extraccion",
    status: "Completo",
    detail: "Entidades normativas, zonas y capas detectadas.",
  },
  {
    step: "Resolucion",
    status: "En curso",
    detail: "Unificando sinonimos: retiro, ronda y proteccion hidrica.",
  },
  {
    step: "Publicacion",
    status: "Pendiente",
    detail: "Falta confirmar el indice para consultas del chat.",
  },
]
