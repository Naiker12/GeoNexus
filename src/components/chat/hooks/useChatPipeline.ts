import * as React from "react"
import type { PipelineState, PipelineStep, PipelineStepKind, ToolCallRecord } from "@/components/chat/reasoning"
import { isTauriAvailable } from "@/api/data"

const STATUS_TO_KIND: Record<string, PipelineStepKind> = {
  classifying: "intent",
  loading_graph: "graph",
  recalling_chunks: "rag",
  building_context: "context",
  searching_web: "web_search",
  calling_tool: "tool_call",
  generating: "generating",
}

const STATUS_LABELS: Record<string, string> = {
  classifying: "Clasificando intención",
  loading_graph: "Cargando grafo",
  recalling_chunks: "Buscando fragmentos",
  building_context: "Construyendo contexto",
  searching_web: "Buscando en web",
  calling_tool: "Ejecutando herramienta",
  generating: "Generando respuesta",
}

const KIND_LABELS: Record<PipelineStepKind, string> = {
  intent: "Clasificando intención",
  graph: "Cargando grafo",
  rag: "Buscando en documentos",
  context: "Construyendo contexto",
  web_search: "Buscando en la web",
  tool_call: "Ejecutando herramienta",
  generating: "Generando respuesta",
}

function buildMetadata(data: Record<string, unknown>): string {
  const parts: string[] = []
  if (data.intent) parts.push(String(data.intent))
  if (data.confidence) parts.push(`${Math.round(Number(data.confidence) * 100)}%`)
  if (data.node_count) parts.push(`${data.node_count} nodos`)
  if (data.edge_count) parts.push(`${data.edge_count} aristas`)
  if (data.chunk_count) parts.push(`${data.chunk_count} chunks`)
  if (data.nodes_selected) parts.push(`${data.nodes_selected}/${data.nodes_total} nodos`)
  if (data.sources_found) parts.push(`${data.sources_found} fuentes`)
  return parts.join(" · ")
}

export function useChatPipeline() {
  const [pipeline, setPipeline] = React.useState<PipelineState | null>(null)
  const [thinkingText, setThinkingText] = React.useState("")
  const [toolCalls, setToolCalls] = React.useState<ToolCallRecord[]>([])

  const pipelineStepsRef = React.useRef<Map<string, PipelineStep>>(new Map())
  const pipelineOrderRef = React.useRef<string[]>([])
  const pipelineStepStartRef = React.useRef<Map<string, number>>(new Map())
  const toolCallRef = React.useRef<Partial<ToolCallRecord> | null>(null)

  const resetPipeline = React.useCallback(() => {
    setPipeline(null)
    setThinkingText("")
    setToolCalls([])
    pipelineStepsRef.current = new Map()
    pipelineOrderRef.current = []
    pipelineStepStartRef.current = new Map()
    toolCallRef.current = null
  }, [])

  const markPipelineComplete = React.useCallback((totalDurationMs: number) => {
    setPipeline((prev) => {
      if (!prev) return null
      return {
        ...prev,
        status: "completed",
        totalDurationMs,
        steps: prev.steps.map((s) =>
          s.status === "active" ? { ...s, status: "done" as const } : s,
        ),
      }
    })
  }, [])

  // Tauri event listeners for pipeline, thinking, tool calls
  React.useEffect(() => {
    if (!isTauriAvailable()) return

    let unlistenEvent: (() => void) | undefined
    let unlistenThinking: (() => void) | undefined
    let unlistenToolCall: (() => void) | undefined
    let unlistenToolResult: (() => void) | undefined

    import("@tauri-apps/api/event").then(({ listen }) => {
      listen<{ agent: string; status: string; message: string; timestamp: number; data?: Record<string, unknown> }>(
        "agent:event",
        (event) => {
          const { status, message, data } = event.payload
          const kind = STATUS_TO_KIND[status]
          if (!kind) return

          setPipeline((prev) => {
            if (!prev) {
              pipelineStepsRef.current = new Map()
              pipelineOrderRef.current = []
              pipelineStepStartRef.current.set("0", Date.now())
              pipelineStepsRef.current.set(kind, {
                id: `pipeline-${kind}`,
                kind,
                label: message || STATUS_LABELS[status] || KIND_LABELS[kind],
                metadata: data ? buildMetadata(data) : undefined,
                status: "active",
              })
              pipelineOrderRef.current.push(kind)
              return {
                status: "running",
                steps: [pipelineStepsRef.current.get(kind)!],
              }
            }

            const existingIdx = prev.steps.findIndex((s) => s.kind === kind)

            if (existingIdx === -1) {
              const updated = prev.steps.map((s) => {
                if (s.status !== "active") return s
                const startKey = `${prev.steps.indexOf(s)}`
                const startMs = pipelineStepStartRef.current.get(startKey) ?? Date.now()
                return { ...s, status: "done" as const, durationMs: Date.now() - startMs }
              })
              const newStep: PipelineStep = {
                id: `pipeline-${kind}`,
                kind,
                label: message || STATUS_LABELS[status] || KIND_LABELS[kind],
                metadata: data ? buildMetadata(data) : undefined,
                status: "active",
              }
              pipelineStepsRef.current.set(kind, newStep)
              pipelineOrderRef.current.push(kind)
              pipelineStepStartRef.current.set(`${prev.steps.length}`, Date.now())
              return { ...prev, steps: [...updated, newStep] }
            }

            const stepDone = status === "response_complete" || status === "generating"
            const newSteps = prev.steps.map((s, i) => {
              if (i !== existingIdx) return s
              const startKey = `${i}`
              const startMs = pipelineStepStartRef.current.get(startKey) ?? Date.now()
              if (stepDone) pipelineStepStartRef.current.delete(startKey)
              return {
                ...s,
                metadata: data ? buildMetadata(data) : s.metadata,
                status: stepDone ? ("done" as const) : ("active" as const),
                durationMs: stepDone ? Date.now() - startMs : undefined,
              }
            }) as PipelineStep[]

            return { ...prev, steps: newSteps }
          })
        },
      ).then((u) => { unlistenEvent = u })

      try {
        listen<{ text: string; is_partial?: boolean }>(
          "reasoning:thinking",
          (event) => {
            const { text, is_partial } = event.payload
            setThinkingText((prev) => (is_partial ? prev + text : text))
          },
        ).then((u) => { unlistenThinking = u })
      } catch { }

      listen<{ tool_name: string; tool_call_id: string; args: Record<string, unknown> }>(
        "llm:tool_call",
        (event) => {
          const { tool_name, args } = event.payload
          const id = `tool-${Date.now()}`
          toolCallRef.current = { id, toolName: tool_name, args, status: "pending" }
          setToolCalls((prev) => [...prev, { id, toolName: tool_name, args, status: "pending" }])
        },
      ).then((u) => { unlistenToolCall = u })

      listen<{ tool_name: string; success: boolean; duration_ms: number; result?: unknown }>(
        "llm:tool_result",
        (event) => {
          const { tool_name, success, duration_ms, result } = event.payload
          setToolCalls((prev) => {
            const idx = prev.length - 1
            if (idx < 0) return prev
            const updated = [...prev]
            const existing = updated[idx]
            if (existing.toolName !== tool_name && existing.status === "pending") {
              const ref = toolCallRef.current
              if (ref && ref.toolName === tool_name) {
                updated[idx] = {
                  ...existing,
                  toolName: tool_name,
                  args: ref.args ?? {},
                  resultSummary: typeof result === "string" ? result : success ? "Completado" : "Error",
                  durationMs: duration_ms,
                  status: success ? "done" : "error",
                }
              }
              return updated
            }
            updated[idx] = {
              ...existing,
              resultSummary: typeof result === "string" ? result : success ? "Completado" : "Error",
              durationMs: duration_ms,
              status: success ? "done" : "error",
            }
            return updated
          })
          toolCallRef.current = null
        },
      ).then((u) => { unlistenToolResult = u })
    })

    return () => {
      unlistenEvent?.()
      unlistenThinking?.()
      unlistenToolCall?.()
      unlistenToolResult?.()
    }
  }, [])

  return {
    pipeline,
    setPipeline,
    thinkingText,
    setThinkingText,
    toolCalls,
    setToolCalls,
    resetPipeline,
    markPipelineComplete,
    pipelineStepStartRef,
  }
}
