import { useEffect, useState, useCallback, useRef } from "react"
import type { ReasoningStep, ReasoningStepDisplay, SessionSummary } from "@/types/chat"

interface ToolCallPayload {
  tool_name: string
  tool_call_id: string
  args: Record<string, unknown>
}

interface ToolResultPayload {
  tool_name: string
  success: boolean
  duration_ms: number
}

interface LlmDonePayload {
  content_length: number
  model: string
}

const STEP_LABELS: Record<string, (meta: Record<string, unknown>) => string> = {
  intent_classified: (m) =>
    `Entendiendo: "${m.intent}" con ${((m.confidence as number) * 100).toFixed(0)}% confianza`,
  knowledge_retrieved: (m) =>
    `Encontré ${m.chunks_found} fragmentos relevantes en ${(m.assets_queried as string[]).length} fuentes`,
  web_searching: (m) =>
    `Buscando en la web: "${m.query}" → ${m.sources_found} resultados`,
  skills_injected: (m) =>
    `Aplicando skills: ${(m.skill_names as string[]).join(", ")}`,
  mcp_tool_called: (m) =>
    `Ejecutando ${m.tool_name} (${m.duration_ms}ms)`,
  graph_context_loaded: (m) =>
    `Cargando grafo: ${m.nodes_count} nodos, ${m.edges_count} conexiones`,
  generating_response: (m) =>
    `Generando con ${m.model}`,
  response_complete: (m) =>
    `Completado en ${((m.total_duration_ms as number) / 1000).toFixed(1)}s · ${m.output_tokens} tokens`,
}

const SHORT_LABELS: Record<string, string> = {
  intent_classified: "Clasificando consulta",
  knowledge_retrieved: "Consultando documentos",
  web_searching: "Buscando en web",
  skills_injected: "Aplicando skills",
  mcp_tool_called: "Ejecutando herramientas",
  graph_context_loaded: "Cargando grafo",
  generating_response: "Generando respuesta",
  response_complete: "Completado",
}

function mapEventToStep(event: ReasoningStep, index: number): ReasoningStepDisplay {
  const type = event.type
  const meta = event as unknown as Record<string, unknown>
  const labelFn = STEP_LABELS[type]
  const label = labelFn ? labelFn(meta) : (SHORT_LABELS[type] ?? type)

  let detail = ""
  switch (type) {
    case "intent_classified":
      detail = `Intención: ${event.intent} (${(event.confidence * 100).toFixed(0)}%)`
      break
    case "knowledge_retrieved":
      detail = `${event.chunks_found} fragmentos en ${event.assets_queried.join(", ")}`
      break
    case "web_searching":
      detail = `${event.sources_found} resultados para "${event.query}"`
      break
    case "skills_injected":
      detail = event.skill_names.join(", ")
      break
    case "mcp_tool_called":
      detail = `${event.tool_name} (${event.duration_ms}ms, ${event.success ? "éxito" : "fallo"})`
      break
    case "graph_context_loaded":
      detail = `${event.nodes_count} nodos, ${event.edges_count} aristas`
      break
    case "generating_response":
      detail = `Modelo: ${event.model}`
      break
    case "response_complete":
      detail = `${event.total_duration_ms}ms total, ${event.output_tokens} tokens generados`
      break
  }

  return {
    id: `${type}-${index}`,
    type,
    label,
    detail,
    durationMs: "duration_ms" in meta ? (meta.duration_ms as number) : undefined,
    status: "done",
  }
}

function makeToolCallStep(payload: ToolCallPayload, index: number): ReasoningStepDisplay {
  return {
    id: `mcp_tool_called-${index}`,
    type: "mcp_tool_called",
    label: `Ejecutando ${payload.tool_name}...`,
    detail: `Herramienta: ${payload.tool_name}`,
    durationMs: undefined,
    status: "running",
  }
}

function makeToolResultStep(payload: ToolCallPayload & ToolResultPayload, index: number): ReasoningStepDisplay {
  return {
    id: `mcp_tool_called-${index}`,
    type: "mcp_tool_called",
    label: `Ejecutando ${payload.tool_name} (${payload.duration_ms}ms)`,
    detail: `Herramienta: ${payload.tool_name} · ${payload.duration_ms}ms · ${payload.success ? "éxito" : "fallo"}`,
    durationMs: payload.duration_ms,
    status: "done",
  }
}

export function useReasoningStream() {
  const [steps, setSteps] = useState<ReasoningStepDisplay[]>([])
  const [isReasoning, setIsReasoning] = useState(false)
  const [summary, setSummary] = useState<SessionSummary | null>(null)
  const toolCallRef = useRef<ToolCallPayload | null>(null)

  const unlistenStep = useRef<(() => void) | null>(null)
  const unlistenDone = useRef<(() => void) | null>(null)
  const unlistenToolCall = useRef<(() => void) | null>(null)
  const unlistenToolResult = useRef<(() => void) | null>(null)
  const unlistenLlmDone = useRef<(() => void) | null>(null)

  const reset = useCallback(() => {
    setSteps([])
    setIsReasoning(false)
    setSummary(null)
    toolCallRef.current = null
  }, [])

  useEffect(() => {
    let mounted = true

    const setup = async () => {
      const { listen } = await import("@tauri-apps/api/event")

      // Reasoning steps from send_message pipeline
      unlistenStep.current = await listen<ReasoningStep>("reasoning:step", ({ payload }) => {
        if (!mounted) return

        if (payload.type === "intent_classified") {
          setSteps([{ ...mapEventToStep(payload, 0), status: "running" }])
          setIsReasoning(true)
          return
        }

        setSteps((prev) => {
          const updated = prev.map((s) =>
            s.status === "running" ? { ...s, status: "done" as const } : s
          )
          return [
            ...updated,
            {
              ...mapEventToStep(payload, prev.length),
              status: payload.type === "response_complete" ? ("done" as const) : ("running" as const),
            },
          ]
        })

        if (payload.type === "response_complete") {
          setIsReasoning(false)
        }
      })

      // Session summary
      unlistenDone.current = await listen<SessionSummary>("reasoning:done", ({ payload }) => {
        if (!mounted) return
        setSummary(payload)
      })

      // Live tool call started
      unlistenToolCall.current = await listen<ToolCallPayload>("llm:tool_call", ({ payload }) => {
        if (!mounted) return
        toolCallRef.current = payload
        setSteps((prev) => {
          const updated = prev.map((s) =>
            s.status === "running" ? { ...s, status: "done" as const } : s
          )
          return [...updated, makeToolCallStep(payload, prev.length)]
        })
      })

      // Live tool call result
      unlistenToolResult.current = await listen<ToolResultPayload>("llm:tool_result", ({ payload }) => {
        if (!mounted) return
        const toolCall = toolCallRef.current
        toolCallRef.current = null

        setSteps((prev) => {
          if (prev.length === 0) return prev
          if (!toolCall) {
            const last = prev[prev.length - 1]
            if (last.type === "mcp_tool_called" && last.status === "running") {
              const updated = [...prev]
              updated[updated.length - 1] = {
                ...last,
                status: "done",
                label: `Ejecutando ${payload.tool_name} (${payload.duration_ms}ms)`,
                detail: `${payload.tool_name} · ${payload.duration_ms}ms · ${payload.success ? "éxito" : "fallo"}`,
                durationMs: payload.duration_ms,
              }
              return updated
            }
            return prev
          }
          const updated = [...prev]
          const combinedPayload = { ...toolCall, ...payload }
          updated[updated.length - 1] = makeToolResultStep(combinedPayload, prev.length - 1)
          return updated
        })
      })

      // LLM generation done
      unlistenLlmDone.current = await listen<LlmDonePayload>("llm:done", () => {
        // Signal only — the response_complete reasoning:step handles the final status
      })
    }

    setup()

    return () => {
      mounted = false
      unlistenStep.current?.()
      unlistenDone.current?.()
      unlistenToolCall.current?.()
      unlistenToolResult.current?.()
      unlistenLlmDone.current?.()
    }
  }, [])

  return { steps, isReasoning, summary, reset }
}
