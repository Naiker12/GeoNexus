export const analysisSummary = [
  {
    label: "Tokens hoy",
    value: "48.2k",
    detail: "+12% vs ayer",
  },
  {
    label: "Consultas IA",
    value: "86",
    detail: "14 con tools MCP",
  },
  {
    label: "Costo estimado",
    value: "$0.00",
    detail: "Modelos locales activos",
  },
  {
    label: "Trazas guardadas",
    value: "31",
    detail: "Memoria + grafo",
  },
]

export const tokenTimeline = [
  { hour: "08:00", tokens: 2800 },
  { hour: "09:00", tokens: 5200 },
  { hour: "10:00", tokens: 8400 },
  { hour: "11:00", tokens: 6400 },
  { hour: "12:00", tokens: 9300 },
  { hour: "13:00", tokens: 7100 },
  { hour: "14:00", tokens: 9100 },
]

export const modelUsage = [
  {
    model: "llama3.1",
    provider: "Ollama",
    tokens: 31200,
    requests: 54,
    color: "bg-primary",
  },
  {
    model: "nomic-embed-text",
    provider: "Embeddings",
    tokens: 11800,
    requests: 21,
    color: "bg-sky-500",
  },
  {
    model: "Memory MCP",
    provider: "MCP",
    tokens: 5200,
    requests: 11,
    color: "bg-emerald-500",
  },
]

export const analysisRuns = [
  {
    name: "Consulta POT por zona",
    route: "Chat IA",
    model: "llama3.1",
    tokens: "8.4k",
    traceId: "trc-44ad",
    status: "Guardado",
  },
  {
    name: "Buffer 500m",
    route: "QGIS MCP",
    model: "tool-call",
    tokens: "2.1k",
    traceId: "trc-8f21",
    status: "Completo",
  },
  {
    name: "Indexacion POT",
    route: "Documentos",
    model: "nomic-embed-text",
    tokens: "11.8k",
    traceId: "trc-a18c",
    status: "Memoria",
  },
  {
    name: "Relacion uso industrial",
    route: "Grafo",
    model: "llama3.1",
    tokens: "5.7k",
    traceId: "trc-91c0",
    status: "Revision",
  },
]

export const skillUsage = [
  { skill: "Lectura POT", calls: 28, accuracy: "92%" },
  { skill: "Cruces GIS", calls: 16, accuracy: "88%" },
  { skill: "Memoria semantica", calls: 34, accuracy: "95%" },
  { skill: "Grafo trazable", calls: 12, accuracy: "86%" },
]
