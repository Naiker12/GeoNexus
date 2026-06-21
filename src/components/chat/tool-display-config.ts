import {
  BotIcon,
  BrainIcon,
  Code2Icon,
  DatabaseIcon,
  FileTextIcon,
  FolderIcon,
  GitBranchIcon,
  GlobeIcon,
  LucideIcon,
  PlugIcon,
  SearchIcon,
  SparklesIcon,
  TerminalIcon,
} from "lucide-react"
import type { AgentStepType } from "@/types/reasoning-timeline"

export interface StepDisplayConfig {
  Icon: LucideIcon
  title: string
  agentType: AgentStepType
  accent: string
  bg: string
}

export const STEP_DISPLAY_CONFIG: Record<string, StepDisplayConfig> = {
  intent: {
    Icon: BrainIcon,
    title: "Intencion",
    agentType: "planner",
    accent: "#D97706",
    bg: "rgba(217, 119, 6, 0.11)",
  },
  graph_context: {
    Icon: GitBranchIcon,
    title: "Grafo",
    agentType: "discovery",
    accent: "#2563EB",
    bg: "rgba(37, 99, 235, 0.11)",
  },
  rag: {
    Icon: DatabaseIcon,
    title: "Documentos",
    agentType: "discovery",
    accent: "#2563EB",
    bg: "rgba(37, 99, 235, 0.11)",
  },
  web_search: {
    Icon: GlobeIcon,
    title: "Busqueda web",
    agentType: "discovery",
    accent: "#0891B2",
    bg: "rgba(8, 145, 178, 0.11)",
  },
  skills: {
    Icon: SparklesIcon,
    title: "Skills",
    agentType: "tool",
    accent: "#7C3AED",
    bg: "rgba(124, 58, 237, 0.11)",
  },
  mcp: {
    Icon: PlugIcon,
    title: "MCP",
    agentType: "terminal",
    accent: "#4F46E5",
    bg: "rgba(79, 70, 229, 0.11)",
  },
  generating: {
    Icon: BotIcon,
    title: "Generando",
    agentType: "coding",
    accent: "#059669",
    bg: "rgba(5, 150, 105, 0.11)",
  },
  read_file: {
    Icon: FileTextIcon,
    title: "Leer archivo",
    agentType: "coding",
    accent: "#059669",
    bg: "rgba(5, 150, 105, 0.11)",
  },
  search_code: {
    Icon: SearchIcon,
    title: "Buscar codigo",
    agentType: "coding",
    accent: "#059669",
    bg: "rgba(5, 150, 105, 0.11)",
  },
  list_directory: {
    Icon: FolderIcon,
    title: "Listar directorio",
    agentType: "coding",
    accent: "#059669",
    bg: "rgba(5, 150, 105, 0.11)",
  },
  glob_files: {
    Icon: Code2Icon,
    title: "Glob",
    agentType: "coding",
    accent: "#059669",
    bg: "rgba(5, 150, 105, 0.11)",
  },
  list_mcp_status: {
    Icon: PlugIcon,
    title: "Estado MCP",
    agentType: "terminal",
    accent: "#4F46E5",
    bg: "rgba(79, 70, 229, 0.11)",
  },
}

const AGENT_TYPE_DISPLAY: Record<string, StepDisplayConfig> = {
  planner: { Icon: BrainIcon, title: "Planificador", agentType: "planner", accent: "#D97706", bg: "rgba(217, 119, 6, 0.11)" },
  discovery: { Icon: GitBranchIcon, title: "Descubrimiento", agentType: "discovery", accent: "#2563EB", bg: "rgba(37, 99, 235, 0.11)" },
  tool: { Icon: SparklesIcon, title: "Herramienta", agentType: "tool", accent: "#7C3AED", bg: "rgba(124, 58, 237, 0.11)" },
  coding: { Icon: BotIcon, title: "Codificación", agentType: "coding", accent: "#059669", bg: "rgba(5, 150, 105, 0.11)" },
  terminal: { Icon: TerminalIcon, title: "Terminal", agentType: "terminal", accent: "#4F46E5", bg: "rgba(79, 70, 229, 0.11)" },
  report: { Icon: FileTextIcon, title: "Reporte", agentType: "report", accent: "#D97706", bg: "rgba(217, 119, 6, 0.11)" },
}

export const STEP_DISPLAY_FALLBACK: StepDisplayConfig = {
  Icon: TerminalIcon,
  title: "Paso",
  agentType: "custom",
  accent: "#6B7280",
  bg: "rgba(107, 114, 128, 0.12)",
}

export function getStepDisplay(stepId: string, label?: string, agentType?: string): StepDisplayConfig {
  if (STEP_DISPLAY_CONFIG[stepId]) {
    return STEP_DISPLAY_CONFIG[stepId]
  }
  if (stepId.startsWith("mcp__")) {
    const name = stepId.replace(/^mcp__/, "").replace(/__/g, " · ")
    return { ...STEP_DISPLAY_CONFIG.mcp, title: name || "MCP" }
  }
  if (agentType && AGENT_TYPE_DISPLAY[agentType]) {
    return { ...AGENT_TYPE_DISPLAY[agentType], title: label ?? AGENT_TYPE_DISPLAY[agentType].title }
  }
  if (label) {
    return { ...STEP_DISPLAY_FALLBACK, title: label }
  }
  return STEP_DISPLAY_FALLBACK
}
