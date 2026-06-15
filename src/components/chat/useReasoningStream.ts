import { useEffect, useState, useCallback, useRef } from "react"
import type { ReasoningStep, ReasoningStepDisplay, SessionSummary, ToolCallDisplay } from "@/types/chat"

interface ToolCallPayload {
  tool_name: string
  tool_call_id: string
  args: Record<string, unknown>
}

interface ToolResultPayload {
  tool_name: string
  success: boolean
  duration_ms: number
  result?: unknown
}

interface LlmDonePayload {
  content_length: number
  model: string
}

// Optional thinking text event for future
interface ThinkingTextPayload {
  text: string
  is_partial?: boolean
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
    `Ejecutando ${m.tool_name}`,
  graph_context_loaded: (m) => {
    // Support both old and new formats for backward compatibility
    if ("nodes_selected" in m && "nodes_total" in m) {
      const nodesSel = Number(m.nodes_selected)
      const nodesTot = Number(m.nodes_total)
      if (nodesSel < nodesTot) {
        return `Grafo: ${nodesSel} de ${nodesTot} nodos relevantes para esta consulta`
      }
    }
    return `Cargando grafo: ${m.nodes_count} nodos, ${m.edges_count} conexiones`
  },
  generating_response: () =>
    `Generando respuesta...`,
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
      detail = `"${event.query}"`
      break
    case "skills_injected":
      detail = event.skill_names.join(", ")
      break
    case "mcp_tool_called":
      detail = event.success ? "éxito" : "fallo"
      break
    case "graph_context_loaded":
      // Show better details for new format
      if ("nodes_selected" in event && "nodes_total" in event) {
        const gEvent = event as any
        detail = `${gEvent.nodes_selected} nodos seleccionados`
        if ("edges_selected" in gEvent) {
          detail += `, ${gEvent.edges_selected} conexiones`
        }
      } else {
        detail = `${event.nodes_count} nodos, ${event.edges_count} aristas`
      }
      break
    case "generating_response":
      detail = ""
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
    detail: "",
    durationMs: undefined,
    status: "running",
  }
}

function makeToolResultStep(payload: ToolCallPayload & ToolResultPayload, index: number): ReasoningStepDisplay {
  return {
    id: `mcp_tool_called-${index}`,
    type: "mcp_tool_called",
    label: `Ejecutando ${payload.tool_name}`,
    detail: payload.success ? "éxito" : "fallo",
    durationMs: payload.duration_ms,
    status: "done",
  }
}

export function useReasoningStream() {
  const [steps, setSteps] = useState<ReasoningStepDisplay[]>([])
  const [isReasoning, setIsReasoning] = useState(false)
  const [summary, setSummary] = useState<SessionSummary | null>(null)
  const [thinkingText, setThinkingText] = useState("")
  const [toolCalls, setToolCalls] = useState<ToolCallDisplay[]>([])
  const toolCallRef = useRef<ToolCallPayload | null>(null)
  const toolIndexRef = useRef(0)

  const unlistenStep = useRef<(() => void) | null>(null)
  const unlistenDone = useRef<(() => void) | null>(null)
  const unlistenToolCall = useRef<(() => void) | null>(null)
  const unlistenToolResult = useRef<(() => void) | null>(null)
  const unlistenLlmDone = useRef<(() => void) | null>(null)
  const unlistenThinking = useRef<(() => void) | null>(null)

  const reset = useCallback(() => {
        console.log("🔄 Resetting reasoning stream state")
        setSteps([])
        setIsReasoning(false)
        setSummary(null)
        setThinkingText("")
        setToolCalls([])
        toolCallRef.current = null
        toolIndexRef.current = 0
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
          // Optional: add initial synthetic thinking text!
          setThinkingText("Analizando la consulta del usuario...")
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

        // Add some synthetic thinking text for demo!
        if (payload.type === "knowledge_retrieved") {
          setThinkingText(prev => prev + `\nEncontré ${(payload as any).chunks_found} fragmentos relevantes...`)
        }
        if (payload.type === "graph_context_loaded") {
          const gPayload = payload as any
          const nodesInfo = gPayload.nodes_selected ? `${gPayload.nodes_selected} de ${gPayload.nodes_total}` : `${gPayload.nodes_count}`
          setThinkingText(prev => prev + `\nEl grafo tiene ${nodesInfo} nodos relevantes.`)
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
        toolIndexRef.current += 1

        setSteps((prev) => {
          const updated = prev.map((s) =>
            s.status === "running" ? { ...s, status: "done" as const } : s
          )
          return [...updated, makeToolCallStep(payload, prev.length)]
        })

        // Add to our new tool calls display!
        setToolCalls(prev => [...prev, {
          id: `tool-${toolIndexRef.current}`,
          toolName: payload.tool_name,
          args: payload.args,
          status: "running",
        }])
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
                label: `Ejecutando ${payload.tool_name}`,
                detail: payload.success ? "éxito" : "fallo",
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

        // Also update our new tool calls display!
        setToolCalls(prev => {
          if (prev.length === 0) return prev
          const newCalls = [...prev]
          const lastIdx = newCalls.length - 1
          newCalls[lastIdx] = {
            ...newCalls[lastIdx],
            status: payload.success ? "success" : "error",
            durationMs: payload.duration_ms,
            result: payload.result,
          }
          return newCalls
        })
      })

      // Optional listener for real thinking text event
      try {
        unlistenThinking.current = await listen<ThinkingTextPayload>("reasoning:thinking", ({ payload }) => {
          if (!mounted) return
          if (payload.is_partial) {
            setThinkingText(prev => prev + payload.text)
          } else {
            setThinkingText(payload.text)
          }
        })
      } catch (e) {
        // Ignore if event not available
      }

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
      unlistenThinking.current?.()
    }
  }, [])

  return { steps, isReasoning, summary, thinkingText, toolCalls, reset }
}
