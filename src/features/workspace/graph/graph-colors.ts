import type { GraphNodeType } from "@/types/data"

export const NODE_COLORS: Record<GraphNodeType, string> = {
  norma: "#F4A261",
  documento: "#4ECDC4",
  capa: "#45B7D1",
  zona: "#96CEB4",
  concepto: "#A8A4FF",
  chat_turn: "#FF6B9D",
  web_search: "#48CAE4",
  upload: "#FFD93D",
  connector: "#FF6B6B",
  rag_recall: "#C77DFF",
}

export const NODE_TAILWIND: Record<GraphNodeType, string> = {
  norma: "bg-[#F4A261]",
  documento: "bg-[#4ECDC4]",
  capa: "bg-[#45B7D1]",
  zona: "bg-[#96CEB4]",
  concepto: "bg-[#A8A4FF]",
  chat_turn: "bg-[#FF6B9D]",
  web_search: "bg-[#48CAE4]",
  upload: "bg-[#FFD93D]",
  connector: "bg-[#FF6B6B]",
  rag_recall: "bg-[#C77DFF]",
}

export const NODE_TYPE_LABELS: Record<GraphNodeType, string> = {
  norma: "Norma",
  documento: "Documento",
  capa: "Capa GIS",
  zona: "Zona territorial",
  concepto: "Concepto técnico",
  chat_turn: "Chat",
  web_search: "Búsqueda web",
  upload: "Subida",
  connector: "Conector",
  rag_recall: "Recuperación RAG",
}

export function nodeColor(type: GraphNodeType): string {
  return NODE_COLORS[type] ?? "#A8A4FF"
}

export function nodeColorHex(type: GraphNodeType): string {
  return NODE_COLORS[type] ?? "#A8A4FF"
}

export function nodeTailwind(type: GraphNodeType): string {
  return NODE_TAILWIND[type] ?? "bg-[#A8A4FF]"
}

export function nodeTypeLabel(type: GraphNodeType): string {
  return NODE_TYPE_LABELS[type] ?? type
}
