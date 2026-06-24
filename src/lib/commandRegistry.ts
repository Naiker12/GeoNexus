import { useUiStore } from "@/stores/uiStore"

export interface CommandDef {
  id: string
  label: string
  category: string
  shortcut?: string
  run: () => void | Promise<void>
  keywords?: string[]
}

type NavigateFn = (hash: string) => void

export function buildRegistry(navigate: NavigateFn): CommandDef[] {
  return [
    {
      id: "chat.new",
      label: "Nueva conversación",
      category: "Chat",
      shortcut: "Ctrl+N",
      run: () => navigate("#chat"),
      keywords: ["new", "crear", "empezar"],
    },
    {
      id: "settings.open",
      label: "Abrir configuración",
      category: "General",
      shortcut: "Ctrl+Shift+P",
      run: () => {
        window.dispatchEvent(new CustomEvent("geonexus:open-settings"))
      },
      keywords: ["settings", "preferences", "opciones", "preferencias"],
    },
    {
      id: "agents.toggle",
      label: "Activar/desactivar agente",
      category: "Agentes",
      run: () => {
        import("@/features/agent/store/useAgentTaskStore").then((m) => {
          const store = m.useAgentTaskStore.getState()
          store.setMode(store.mode === "agent" ? "chat" : "agent")
        })
      },
      keywords: ["agent", "toggle", "task", "tarea"],
    },
    {
      id: "mcp.list",
      label: "Ver servidores MCP",
      category: "MCP",
      run: () => navigate("#mcp"),
      keywords: ["mcp", "servers", "servidores", "tools"],
    },
    {
      id: "workspace.files",
      label: "Gestor de documentos",
      category: "Workspace",
      run: () => navigate("#files"),
      keywords: ["documents", "files", "archivos", "documentos"],
    },
    {
      id: "workspace.graph",
      label: "Abrir grafo de conocimiento",
      category: "Conocimiento",
      run: () => navigate("#memory"),
      keywords: ["graph", "knowledge", "grafo", "conocimiento", "memoria"],
    },
    {
      id: "workspace.skills",
      label: "Explorar skills",
      category: "Agentes",
      run: () => navigate("#skills"),
      keywords: ["skills", "habilidades", "plugins"],
    },
    {
      id: "workspace.analysis",
      label: "Panel de análisis",
      category: "Workspace",
      run: () => navigate("#uso"),
      keywords: ["analytics", "usage", "uso", "análisis", "estadísticas"],
    },
    {
      id: "workspace.connectors",
      label: "Administrar conectores",
      category: "Connections",
      run: () => navigate("#conectores"),
      keywords: ["connectors", "conectores", "llm", "api keys"],
    },
    {
      id: "chat.search",
      label: "Buscar en documentos",
      category: "Búsqueda",
      shortcut: "Ctrl+Shift+F",
      run: () => navigate("#files"),
      keywords: ["search", "find", "buscar", "encontrar"],
    },
    {
      id: "projects.list",
      label: "Ir a proyectos",
      category: "Workspace",
      run: () => navigate("#projects"),
      keywords: ["projects", "proyectos", "workspace"],
    },
    {
      id: "chat.tasks",
      label: "Ver tareas activas",
      category: "Agentes",
      run: () => navigate("#tasks"),
      keywords: ["tasks", "tareas", "activas", "pending"],
    },
    {
      id: "workspace.map",
      label: "Abrir mapa",
      category: "GIS",
      run: () => {
        window.dispatchEvent(new CustomEvent("geonexus:open-map"))
      },
      keywords: ["map", "gis", "mapa", "cartografía"],
    },
  ]
}


