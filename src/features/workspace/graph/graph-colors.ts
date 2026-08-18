import type { GraphNodeKind } from "@/types/graph"

export const NODE_COLORS: Record<GraphNodeKind, string> = {
  entity: "#A8A4FF",
  concept: "#A8A4FF",
  file: "#F4A261",
  agent: "#C77DFF",
  norma: "#F4A261",
  documento: "#4ECDC4",
  capa: "#45B7D1",
  zona: "#96CEB4",
  chat_turn: "#FF6B9D",
  web_search: "#48CAE4",
  upload: "#FFD93D",
  connector: "#FF6B6B",
  rag_recall: "#C77DFF",
}

export const NODE_TAILWIND: Record<GraphNodeKind, string> = {
  entity: "bg-[#A8A4FF]",
  concept: "bg-[#A8A4FF]",
  file: "bg-[#F4A261]",
  agent: "bg-[#C77DFF]",
  norma: "bg-[#F4A261]",
  documento: "bg-[#4ECDC4]",
  capa: "bg-[#45B7D1]",
  zona: "bg-[#96CEB4]",
  chat_turn: "bg-[#FF6B9D]",
  web_search: "bg-[#48CAE4]",
  upload: "bg-[#FFD93D]",
  connector: "bg-[#FF6B6B]",
  rag_recall: "bg-[#C77DFF]",
}

export const NODE_TYPE_LABELS: Record<GraphNodeKind, string> = {
  entity: "Entidad",
  concept: "Concepto",
  file: "Archivo",
  agent: "Agente",
  norma: "Norma",
  documento: "Documento",
  capa: "Capa GIS",
  zona: "Zona territorial",
  chat_turn: "Chat",
  web_search: "Búsqueda web",
  upload: "Subida",
  connector: "Conector",
  rag_recall: "Recuperación RAG",
}

export function nodeColor(type: GraphNodeKind): string {
  return NODE_COLORS[type] ?? "#A8A4FF"
}

export function nodeColorHex(type: GraphNodeKind): string {
  return NODE_COLORS[type] ?? "#A8A4FF"
}

export function nodeTailwind(type: GraphNodeKind): string {
  return NODE_TAILWIND[type] ?? "bg-[#A8A4FF]"
}

export function nodeTypeLabel(type: GraphNodeKind): string {
  return NODE_TYPE_LABELS[type] ?? type
}
