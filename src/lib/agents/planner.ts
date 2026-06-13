import type { AgentPlan, SourceRef, AgentSourceType } from "@/types/agents"

export function createPlan(goal: string, mentionedSources?: AgentSourceType[]): AgentPlan {
  const sources: SourceRef[] = mentionedSources?.map(s => ({ type: s } as SourceRef)) ?? []
  return {
    goal,
    needs: [],
    sources,
    steps: [
      { agent: "planner", action: "Analizar objetivo", status: "running" },
      { agent: "discovery", action: "Buscar fuentes de datos", status: "idle" },
      { agent: "knowledge", action: "Extraer conocimiento", status: "idle" },
      { agent: "mcp", action: "Ejecutar herramientas MCP", status: "idle" },
      { agent: "reasoning", action: "Razonar con contexto", status: "idle" },
      { agent: "result", action: "Formular respuesta", status: "idle" },
    ],
  }
}
