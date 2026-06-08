export const analysisSummary = [
  { label: "Tokens hoy", value: "0", detail: "Sin actividad registrada" },
  { label: "Consultas IA", value: "0", detail: "Sin ejecuciones" },
  { label: "Costo estimado", value: "$0.00", detail: "Sin proveedor activo" },
  { label: "Trazas guardadas", value: "0", detail: "Sin trazas" },
]

export const tokenTimeline: { hour: string; tokens: number }[] = []

export const modelUsage: {
  model: string
  provider: string
  tokens: number
  requests: number
  color: string
}[] = []

export const analysisRuns: {
  name: string
  route: string
  model: string
  tokens: string
  traceId: string
  status: string
}[] = []

export const skillUsage: {
  skill: string
  calls: number
  accuracy: string
}[] = []
