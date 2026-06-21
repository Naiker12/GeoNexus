import * as React from "react"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"
import type {
  ReasoningStepPayload,
  ReasoningSubItemPayload,
  ReasoningEndPayload,
  ReasoningStep,
  ReasoningTimeline,
} from "@/types/reasoning-timeline"

export function useReasoningTimeline(sessionId: string | null) {
  const [timeline, setTimeline] = React.useState<ReasoningTimeline | null>(null)
  const [isStreaming, setIsStreaming] = React.useState(false)
  const [thinkingText, setThinkingText] = React.useState<string>("")
  const [isCollapsing, setIsCollapsing] = React.useState(false)
  const collapseTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeSessionRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (!sessionId) {
      setTimeline(null)
      setIsStreaming(false)
      setIsCollapsing(false)
      activeSessionRef.current = null
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current)
        collapseTimerRef.current = null
      }
      return
    }

    const unlisteners: UnlistenFn[] = []
    let cancelled = false

    const setup = async () => {
      const uStart = await listen<{ session_id: string }>("reasoning:start", (e) => {
        if (cancelled) return
        const sid = e.payload.session_id
        if (!sid) return
        activeSessionRef.current = sid
        setIsStreaming(true)
        setTimeline(null)
        setIsCollapsing(false)
        if (collapseTimerRef.current) {
          clearTimeout(collapseTimerRef.current)
          collapseTimerRef.current = null
        }
      })
      unlisteners.push(uStart)

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
          return {
            ...base,
            steps: [...base.steps, newStep],
            totalSteps: base.steps.length + 1,
          }
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
              : s,
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

  return { timeline, isStreaming, thinkingText, isCollapsing, toggleCollapse, collapseTimeline }
}
