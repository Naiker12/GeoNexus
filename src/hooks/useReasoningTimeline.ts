import * as React from "react"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"
import type {
  ReasoningStepPayload,
  ReasoningSubItemPayload,
  ReasoningEndPayload,
  ReasoningStep,
  ReasoningTimeline,
} from "@/types/reasoning-timeline"
import type { AgentTraceEvent } from "@/types/chat"

export function useReasoningTimeline(sessionId: string | null) {
  // All state hooks are at the top, no conditionals!
  const [timeline, setTimeline] = React.useState<ReasoningTimeline | null>(null)
  const [traceEvents, setTraceEvents] = React.useState<AgentTraceEvent[]>([])
  const [isStreaming, setIsStreaming] = React.useState(false)
  const [thinkingText, setThinkingText] = React.useState<string>("")
  const [isCollapsing, setIsCollapsing] = React.useState(false)
  const collapseTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeSessionRef = React.useRef<string | null>(null)
  const prevSessionIdRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    // Reset everything whenever sessionId changes
    if (sessionId !== prevSessionIdRef.current) {
      setTimeline(null)
      setTraceEvents([])
      setIsStreaming(false)
      setIsCollapsing(false)
      setThinkingText("")
      activeSessionRef.current = null
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current)
        collapseTimerRef.current = null
      }
      prevSessionIdRef.current = sessionId
    }

    const unlisteners: UnlistenFn[] = []
    let cancelled = false

    if (sessionId) {
      const setup = async () => {
        const uStart = await listen<{ session_id: string }>("reasoning:start", (e) => {
          if (cancelled) return
          const sid = e.payload.session_id
          if (!sid) return
          activeSessionRef.current = sid
          setIsStreaming(true)
          setTimeline(null)
          setTraceEvents([])
          setIsCollapsing(false)
          setThinkingText("")
          if (collapseTimerRef.current) {
            clearTimeout(collapseTimerRef.current)
            collapseTimerRef.current = null
          }
        })
        unlisteners.push(uStart)

        const uAgentEvent = await listen<AgentTraceEvent>("agent:event", (e) => {
          if (cancelled) return
          setTraceEvents((prev) => [...prev, e.payload])
        })
        unlisteners.push(uAgentEvent)

        const uStep = await listen<ReasoningStepPayload>("reasoning:step", (e) => {
          if (cancelled) return
          if (!activeSessionRef.current) return
          const payload = e.payload
          setTimeline((prev) => {
            const base = prev ?? {
              sessionId: sessionId!,
              totalSteps: 0,
              totalDurationMs: 0,
              steps: [],
              isCollapsed: false,
            }
            const idx = base.steps.findIndex((s) => s.id === payload.id)
            if (idx >= 0) {
              const updated = [...base.steps]
              updated[idx] = {
                ...updated[idx],
                agentName: payload.agent_name,
                agentType: (payload.agent_type as any) ?? "custom",
                status: (payload.status as any) ?? "running",
                label: payload.label,
                subItems: payload.sub_items ?? updated[idx].subItems,
                durationMs: payload.duration_ms,
                startedAt: payload.started_at,
                completedAt: payload.completed_at,
              }
              return { ...base, steps: updated, totalSteps: updated.length }
            }
            const newStep: ReasoningStep = {
              id: payload.id,
              agentName: payload.agent_name,
              agentType: (payload.agent_type as any) ?? "custom",
              status: (payload.status as any) ?? "pending",
              label: payload.label,
              subItems: payload.sub_items ?? [],
              durationMs: payload.duration_ms,
              startedAt: payload.started_at,
              completedAt: payload.completed_at,
            }
            return { ...base, steps: [...base.steps, newStep], totalSteps: base.steps.length + 1 }
          })
        })
        unlisteners.push(uStep)

        const uSubItem = await listen<ReasoningSubItemPayload>("reasoning:sub_item", (e) => {
          if (cancelled) return
          if (!activeSessionRef.current) return
          const { step_id, text } = e.payload
          setTimeline((prev) => {
            if (!prev) return prev
            const steps = prev.steps.map((s) =>
              s.id === step_id
                ? { ...s, subItems: [...s.subItems, text ?? ""] }
                : s
            )
            return { ...prev, steps }
          })
        })
        unlisteners.push(uSubItem)

        const uEnd = await listen<ReasoningEndPayload>("reasoning:end", (e) => {
          if (cancelled) return
          if (e.payload.session_id !== activeSessionRef.current) return
          activeSessionRef.current = null
          setIsStreaming(false)
          setThinkingText("")
          setTimeline((prev) => {
            if (!prev) return null
            const duration = e.payload.total_ms > 0
              ? e.payload.total_ms
              : Date.now() - (prev.steps[0]?.startedAt ?? Date.now())
            return { ...prev, totalDurationMs: duration, isCollapsed: false }
          })
          collapseTimerRef.current = setTimeout(() => {
            if (cancelled) return
            setIsCollapsing(true)
            setTimeout(() => {
              if (cancelled) return
              setTimeline((prev) => (prev ? { ...prev, isCollapsed: true } : null))
              setIsCollapsing(false)
            }, 500)
          }, 3000)
        })
        unlisteners.push(uEnd)

        const uThinking = await listen<{ content: string }>("reasoning:thinking", (e) => {
          if (cancelled) return
          if (!activeSessionRef.current) return
          setThinkingText((prev) => prev + e.payload.content)
        })
        unlisteners.push(uThinking)
      }
      setup()
    }

    // Cleanup always runs regardless of sessionId!
    return () => {
      cancelled = true
      activeSessionRef.current = null
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current)
        collapseTimerRef.current = null
      }
      unlisteners.forEach((fn) => fn())
    }
  }, [sessionId])

  // All useCallbacks, no conditionals!
  const toggleCollapse = React.useCallback(() => {
    setTimeline((prev) => (prev ? { ...prev, isCollapsed: !prev.isCollapsed } : null))
  }, [])

  const collapseTimeline = React.useCallback(() => {
    setIsCollapsing(true)
    setTimeout(() => {
      setTimeline((prev) => (prev ? { ...prev, isCollapsed: true } : null))
      setIsCollapsing(false)
    }, 500)
  }, [])

  return { timeline, traceEvents, isStreaming, thinkingText, isCollapsing, toggleCollapse, collapseTimeline }
}
