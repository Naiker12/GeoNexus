import * as React from "react"
import { invoke } from "@tauri-apps/api/core"
import { useCodingAgent } from "@/contexts/CodingAgentContext"
import type { CleanupReport } from "@/types/coding-agent"

export function useAgentCleanup() {
  const { dispatch } = useCodingAgent()
  const [analyzing, setAnalyzing] = React.useState(false)

  const analyze = React.useCallback(
    async (projectPath: string) => {
      setAnalyzing(true)
      try {
        const report = await invoke<CleanupReport>(
          "agent_analyze_project",
          { projectPath },
        )
        dispatch({ type: "SET_CLEANUP_REPORT", payload: report })
        return report
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        dispatch({
          type: "SET_ERROR",
          payload: `Error al analizar proyecto: ${msg}`,
        })
        return null
      } finally {
        setAnalyzing(false)
      }
    },
    [dispatch],
  )

  const runCleanup = React.useCallback(
    async (filesToRemove: string[]) => {
      setAnalyzing(true)
      try {
        const report = await invoke<CleanupReport>(
          "agent_run_cleanup",
          { files: filesToRemove },
        )
        dispatch({ type: "SET_CLEANUP_REPORT", payload: report })
        return report
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        dispatch({
          type: "SET_ERROR",
          payload: `Error al ejecutar limpieza: ${msg}`,
        })
        return null
      } finally {
        setAnalyzing(false)
      }
    },
    [dispatch],
  )

  return { analyze, runCleanup, analyzing }
}
