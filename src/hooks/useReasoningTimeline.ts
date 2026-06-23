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

export interface ReasoningStepItem {
  id: string
  type: "thinking_start" | "reasoning_delta" | "tool_call" | "text_start" | "tool_call_start" | "tool_call_done"
  content?: string
  tool_name?: string
  tool_args?: Record<string, unknown>
  timestamp: number
}

export function useReasoningTimeline(sessionId: string | null) {
  const [timeline, setTimeline] = React.useState<ReasoningTimeline | null>(null)
  const [traceEvents, setTraceEvents] = React.useState<AgentTraceEvent[]>([])
  const [isStreaming, setIsStreaming] = React.useState(false)
  const [thinkingText, setThinkingText] = React.useState<string>("")
  const [isCollapsing, setIsCollapsing] = React.useState(false)
  const [steps, setSteps] = React.useState<ReasoningStepItem[]>([])
  const collapseTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const streamingTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeSessionRef = React.useRef<string | null>(null)
  const prevSessionIdRef = React.useRef<string | null>(null)
  const stepCounterRef = React.useRef(0)

  React.useEffect(() => {
    // Reset everything whenever sessionId changes
    if (sessionId !== prevSessionIdRef.current) {
      setTimeline(null)
      setTraceEvents([])
      setIsStreaming(false)
      setIsCollapsing(false)
      setThinkingText("")
      setSteps([])
      stepCounterRef.current = 0
      activeSessionRef.current = null
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current)
        collapseTimerRef.current = null
      }
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current)
        streamingTimeoutRef.current = null
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
          setSteps([])
          stepCounterRef.current = 0
          if (collapseTimerRef.current) {
            clearTimeout(collapseTimerRef.current)
            collapseTimerRef.current = null
          }
          if (streamingTimeoutRef.current) {
            clearTimeout(streamingTimeoutRef.current)
            streamingTimeoutRef.current = null
          }
          streamingTimeoutRef.current = setTimeout(() => {
            if (cancelled) return
            if (activeSessionRef.current !== sid) return
            activeSessionRef.current = null
            setIsStreaming(false)
            setThinkingText("")
            setTimeline((prev) => {
              if (!prev) return null
              return { ...prev, totalDurationMs: Date.now() - (prev.steps[0]?.startedAt ?? Date.now()), isCollapsed: false }
            })
          }, 180_000)
        }, { target: { kind: "Any" } })
        unlisteners.push(uStart)

        const uAgentEvent = await listen<AgentTraceEvent>("agent:event", (e) => {
          if (cancelled) return
          if (e.payload.conversation_id && e.payload.conversation_id !== sessionId) return
          setTraceEvents((prev) => [...prev, e.payload])
        }, { target: { kind: "Any" } })
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
        }, { target: { kind: "Any" } })
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
        }, { target: { kind: "Any" } })
        unlisteners.push(uSubItem)

        const uEnd = await listen<ReasoningEndPayload>("reasoning:end", (e) => {
          if (cancelled) return
          if (e.payload.session_id !== activeSessionRef.current) return
          activeSessionRef.current = null
          setIsStreaming(false)
          setThinkingText("")
          if (streamingTimeoutRef.current) {
            clearTimeout(streamingTimeoutRef.current)
            streamingTimeoutRef.current = null
          }
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
        }, { target: { kind: "Any" } })
        unlisteners.push(uEnd)

        const uThinking = await listen<{ content: string }>("reasoning:thinking", (e) => {
          if (cancelled) return
          if (!activeSessionRef.current) return
          setThinkingText((prev) => prev + e.payload.content)
        }, { target: { kind: "Any" } })
        unlisteners.push(uThinking)

        const uToolCallStart = await listen<{ conversation_id?: string; tool_name: string; server_id?: string; args?: Record<string, unknown> }>(
          "llm:tool_call_start",
          (e) => {
            if (cancelled) return
            if (e.payload.conversation_id && e.payload.conversation_id !== sessionId) return
            setSteps((prev) => [...prev, {
              id: `step-${++stepCounterRef.current}`,
              type: "tool_call_start",
              tool_name: e.payload.tool_name,
              tool_args: e.payload.args,
              timestamp: Date.now(),
            }])
          },
          { target: { kind: "Any" } }
        )
        unlisteners.push(uToolCallStart)

        const uToolCallDone = await listen<{ conversation_id?: string; tool_name: string; success: boolean; duration_ms?: number }>(
          "llm:tool_call_done",
          (e) => {
            if (cancelled) return
            if (e.payload.conversation_id && e.payload.conversation_id !== sessionId) return
            setSteps((prev) => [...prev, {
              id: `step-${++stepCounterRef.current}`,
              type: "tool_call_done",
              tool_name: e.payload.tool_name,
              content: e.payload.success ? `OK (${e.payload.duration_ms ?? 0}ms)` : "Error",
              timestamp: Date.now(),
            }])
          },
          { target: { kind: "Any" } }
        )
        unlisteners.push(uToolCallDone)

        const uThinkingStart = await listen<{ conversation_id?: string }>(
          "llm:thinking_start",
          (e) => {
            if (cancelled) return
            if (e.payload.conversation_id && e.payload.conversation_id !== sessionId) return
            setIsStreaming(true)
            setSteps((prev) => [...prev, {
              id: `step-${++stepCounterRef.current}`,
              type: "thinking_start",
              timestamp: Date.now(),
            }])
          },
          { target: { kind: "Any" } }
        )
        unlisteners.push(uThinkingStart)

        const uReasoningDelta = await listen<{ conversation_id?: string; content: string }>(
          "llm:reasoning_delta",
          (e) => {
            if (cancelled) return
            if (e.payload.conversation_id && e.payload.conversation_id !== sessionId) return
            setThinkingText((prev) => prev + (e.payload.content ?? ""))
          },
          { target: { kind: "Any" } }
        )
        unlisteners.push(uReasoningDelta)
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
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current)
        streamingTimeoutRef.current = null
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

  const reset = React.useCallback(() => {
    setSteps([])
    setIsStreaming(false)
    setThinkingText("")
    setTimeline(null)
    setTraceEvents([])
    setIsCollapsing(false)
    stepCounterRef.current = 0
    if (streamingTimeoutRef.current) {
      clearTimeout(streamingTimeoutRef.current)
      streamingTimeoutRef.current = null
    }
  }, [])

  return {
    timeline,
    traceEvents,
    isStreaming,
    thinkingText,
    isCollapsing,
    toggleCollapse,
    collapseTimeline,
    steps,
    isThinking: isStreaming,
    reasoningText: thinkingText,
    reset,
  }
}
