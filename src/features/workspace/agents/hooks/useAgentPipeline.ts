import { useState, useCallback } from "react"
import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import type { AgentEvent, AgentPlan, DiscoveredAsset } from "@/types/agents"

interface PipelineState {
  running: boolean
  events: AgentEvent[]
  plan: AgentPlan | null
  assets: DiscoveredAsset[]
  finalAnswer: string | null
  error: string | null
}

const INITIAL: PipelineState = {
  running: false, events: [], plan: null,
  assets: [], finalAnswer: null, error: null,
}

export function useAgentPipeline() {
  const [state, setState] = useState<PipelineState>(INITIAL)

  const pushEvent = (event: AgentEvent) =>
    setState(prev => ({ ...prev, events: [...prev.events, event] }))

  const run = useCallback(async (goal: string, mentionedSources?: string[]) => {
    setState({ ...INITIAL, running: true })

    const unlisten = await listen<AgentEvent>("agent:event", ({ payload }) => {
      pushEvent(payload)
      if (payload.agent === "planner" && payload.status === "done" && payload.data) {
        setState(prev => ({ ...prev, plan: payload.data as AgentPlan }))
      }
      if (payload.agent === "discovery" && payload.status === "done" && payload.data) {
        setState(prev => ({ ...prev, assets: payload.data as DiscoveredAsset[] }))
      }
      if (payload.agent === "result" && payload.status === "done") {
        setState(prev => ({ ...prev, running: false, finalAnswer: payload.message }))
      }
      if (payload.status === "error") {
        setState(prev => ({ ...prev, running: false, error: payload.message }))
      }
    })

    try {
      await invoke("run_agent_pipeline", {
        goal,
        sources: mentionedSources ?? [],
        traceId: crypto.randomUUID(),
      })
    } catch (err) {
      setState(prev => ({ ...prev, running: false, error: String(err) }))
    } finally {
      unlisten()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const reset = () => setState(INITIAL)

  return { ...state, run, reset }
}
