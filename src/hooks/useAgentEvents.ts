import { useEffect } from "react"
import { useNotifications } from "@/hooks/useNotifications"

/** Detecta si estamos dentro del runtime Tauri o en navegador (vite dev server) */
function isTauriAvailable(): boolean {
  return typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined
}

interface SyncCompletedPayload {
  connector_id: string
  connector_name: string
  new_files: number
  updated_files: number
  errors: number
}

interface IndexCompletedPayload {
  asset_id: string
  file_name: string
  chunk_count: number
}

interface ResearchCompletedPayload {
  query: string
  iteration: number
  sources_found: number
}

interface GraphUpdatedPayload {
  project_id: string
  new_nodes: number
  new_edges: number
}

interface AgentTaskPayload {
  task_id: string
  agent_type: string
  description: string
  project_id: string
}

export function useAgentEvents() {
  const { notify } = useNotifications()

  useEffect(() => {
    if (!isTauriAvailable()) {
      return
    }
    const unlisteners: (() => void)[] = []

    const setup = async () => {
      const { listen } = await import("@tauri-apps/api/event")

      unlisteners.push(
        await listen<SyncCompletedPayload>("sync:completed", ({ payload }) => {
          notify({
            category: "sync_completed",
            title: "Sincronización completada",
            message: `${payload.new_files} archivos nuevos en ${payload.connector_name}`,
          })
        })
      )

      unlisteners.push(
        await listen<SyncCompletedPayload>("sync:error", ({ payload }) => {
          notify({
            category: "sync_error",
            title: "Error de sincronización",
            message: `${payload.errors} errores en ${payload.connector_name}`,
          })
        })
      )

      unlisteners.push(
        await listen<IndexCompletedPayload>("index:completed", ({ payload }) => {
          notify({
            category: "document_indexed",
            title: "Documento indexado",
            message: `${payload.file_name} (${payload.chunk_count} chunks)`,
          })
        })
      )

      unlisteners.push(
        await listen<ResearchCompletedPayload>("research:completed", ({ payload }) => {
          notify({
            category: "export_ready",
            title: "Investigación completada",
            message: `"${payload.query.slice(0, 50)}..."`,
          })
        })
      )

      unlisteners.push(
        await listen<GraphUpdatedPayload>("graph:updated", () => {
          notify({
            category: "graph_updated",
            title: "Grafo actualizado",
          })
        })
      )

      unlisteners.push(
        await listen<AgentTaskPayload>("agent:task_failed", ({ payload }) => {
          notify({
            category: "system_warning",
            title: `Error en ${payload.agent_type}`,
            message: payload.description,
          })
        })
      )
    }

    setup()

    return () => {
      unlisteners.forEach((u) => u())
    }
  }, [notify])
}
