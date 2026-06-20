import * as React from "react"
import { invoke } from "@tauri-apps/api/core"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"
import { useCodingAgent } from "@/contexts/CodingAgentContext"
import type { CodingAgentEvent, AgentStatus, FileNode, CleanupReport, CodingAgentPlan, PermissionRequest, LoadedProject, ClarifyingQuestion, WritingFile } from "@/types/coding-agent"
import { useConnectors } from "@/contexts/ConnectorsContext"

export function useCodingAgentEvents(conversationId?: string) {
  const { state, dispatch } = useCodingAgent()
  const { connectors, activeConnectorId } = useConnectors()

  const activeProvider = React.useMemo(() => {
    if (!activeConnectorId) return null
    const active = connectors.find(
      (c) => c.id === activeConnectorId && c.model !== "Sin modelo" && c.endpoint !== "Sin endpoint",
    )
    if (!active) return null
    return {
      provider: active.id,
      model: active.model,
      endpoint: active.endpoint,
      apiKey: active.apiKey,
    }
  }, [activeConnectorId, connectors])

  React.useEffect(() => {
    if (state.mode !== "agent") return

    let cancelled = false
    const unlisteners: UnlistenFn[] = []

    const setupListeners = async () => {
      const u1 = await listen<{ label: string; detail?: string }>(
        "agent:plan",
        (event) => {
          dispatch({ type: "SET_PLAN", payload: event.payload.label })
          dispatch({ type: "SET_STATUS", payload: "planning" })
          const agentEvent: CodingAgentEvent = {
            id: `plan-${Date.now()}`,
            type: "plan",
            label: event.payload.label,
            detail: event.payload.detail,
            status: "done",
            timestamp: Date.now(),
          }
          dispatch({ type: "ADD_EVENT", payload: agentEvent })
        },
        { target: { kind: "Any" } },
      )
      unlisteners.push(u1)

      const uFileWritingStart = await listen<{ path: string; name: string; language: string }>(
        "agent:file_writing_start",
        (event) => {
          if (cancelled) return
          dispatch({
            type: "SET_WRITING_FILE",
            payload: { ...event.payload, accumulatedContent: "" },
          })
          // Also add as a regular event for the timeline
          const agentEvent: CodingAgentEvent = {
            id: `write-${event.payload.path}-${Date.now()}`,
            type: "step_start",
            label: `Escribiendo ${event.payload.path}...`,
            status: "running",
            timestamp: Date.now(),
          }
          dispatch({ type: "ADD_EVENT", payload: agentEvent })
        },
        { target: { kind: "Any" } },
      )
      unlisteners.push(uFileWritingStart)

      const uFileContentChunk = await listen<{ path: string; chunk: string }>(
        "agent:file_content_chunk",
        (event) => {
          if (cancelled) return
          dispatch({ type: "APPEND_FILE_CHUNK", payload: event.payload })
        },
        { target: { kind: "Any" } },
      )
      unlisteners.push(uFileContentChunk)

      const uFileWritingDone = await listen<{ path: string; name: string; totalLines: number }>(
        "agent:file_writing_done",
        (event) => {
          if (cancelled) return
          dispatch({ type: "SET_WRITING_FILE", payload: null })
          // Update the event status to done
          dispatch({
            type: "UPDATE_EVENT_STATUS",
            payload: { id: `write-${event.payload.path}`, status: "done" },
          })
        },
        { target: { kind: "Any" } },
      )
      unlisteners.push(uFileWritingDone)

      const uClarifyingQuestions = await listen<{ questions: ClarifyingQuestion[] }>(
        "agent:clarifying_questions",
        (event) => {
          if (cancelled) return
          dispatch({ type: "SET_CLARIFYING_QUESTIONS", payload: event.payload.questions })
        },
        { target: { kind: "Any" } },
      )
      unlisteners.push(uClarifyingQuestions)

      const uPlanReady = await listen<CodingAgentPlan>(
        "agent:plan_ready",
        (event) => {
          dispatch({ type: "SET_CURRENT_PLAN", payload: event.payload })
          dispatch({
            type: "ADD_EVENT",
            payload: {
              id: `plan-ready-${Date.now()}`,
              type: "plan",
              label: event.payload.summary,
              detail: `${event.payload.files.length} archivo(s) propuesto(s)`,
              status: "done",
              timestamp: Date.now(),
            },
          })
        },
        { target: { kind: "Any" } },
      )
      unlisteners.push(uPlanReady)

      const uPermReq = await listen<PermissionRequest>(
        "agent:permission_required",
        (event) => {
          dispatch({ type: "ADD_PERMISSION_REQUEST", payload: event.payload })
        },
        { target: { kind: "Any" } },
      )
      unlisteners.push(uPermReq)

      const uProjLoaded = await listen<LoadedProject>(
        "agent:project_loaded",
        (event) => {
          dispatch({ type: "SET_PROJECT_LOADED", payload: event.payload })
          if (event.payload.files.length > 0) {
            dispatch({ type: "SET_FILES", payload: event.payload.files })
          }
          dispatch({
            type: "ADD_EVENT",
            payload: {
              id: `project-loaded-${Date.now()}`,
              type: "plan",
              label: `Proyecto cargado: ${event.payload.name}`,
              detail: event.payload.summary,
              status: "done",
              timestamp: Date.now(),
            },
          })
        },
        { target: { kind: "Any" } },
      )
      unlisteners.push(uProjLoaded)

      const u2 = await listen<{ id: string; label: string; detail?: string }>(
        "agent:step_start",
        (event) => {
          dispatch({ type: "SET_STATUS", payload: "coding" })
          const agentEvent: CodingAgentEvent = {
            id: event.payload.id,
            type: "step_start",
            label: event.payload.label,
            detail: event.payload.detail,
            status: "running",
            timestamp: Date.now(),
          }
          dispatch({ type: "ADD_EVENT", payload: agentEvent })
        },
        { target: { kind: "Any" } },
      )
      unlisteners.push(u2)

      const u3 = await listen<{ id: string; duration?: number }>(
        "agent:step_complete",
        (event) => {
          dispatch({
            type: "UPDATE_EVENT",
            payload: {
              id: event.payload.id,
              changes: { status: "done", duration: event.payload.duration },
            },
          })
        },
        { target: { kind: "Any" } },
      )
      unlisteners.push(u3)

      const u4 = await listen<{ id: string; detail?: string }>(
        "agent:step_error",
        (event) => {
          dispatch({
            type: "UPDATE_EVENT",
            payload: {
              id: event.payload.id,
              changes: { status: "error", detail: event.payload.detail },
            },
          })
        },
        { target: { kind: "Any" } },
      )
      unlisteners.push(u4)

      const u5 = await listen<{ path: string; name: string; type: string; status?: string; content?: string; language?: string; reason?: string }>(
        "agent:file_created",
        (event) => {
          const file: FileNode = {
            path: event.payload.path,
            name: event.payload.name,
            type: event.payload.type as "file" | "directory",
            status: (event.payload.status as FileNode["status"]) ?? "done",
            content: event.payload.content,
            language: event.payload.language,
          }
          dispatch({ type: "ADD_FILE", payload: file })
          const detail = event.payload.reason
            ? `${event.payload.path} — ${event.payload.reason}`
            : event.payload.path
          dispatch({
            type: "ADD_EVENT",
            payload: {
              id: `file-${Date.now()}`,
              type: "file_created",
              label: `Archivo creado: ${event.payload.name}`,
              detail,
              status: "done",
              timestamp: Date.now(),
            },
          })
        },
        { target: { kind: "Any" } },
      )
      unlisteners.push(u5)

      const u6 = await listen<{ path: string; name: string; reason?: string }>(
        "agent:file_modified",
        (event) => {
          dispatch({
            type: "UPDATE_FILE",
            payload: {
              path: event.payload.path,
              changes: { status: "done" },
            },
          })
          const detail = event.payload.reason
            ? `${event.payload.path} — ${event.payload.reason}`
            : event.payload.path
          dispatch({
            type: "ADD_EVENT",
            payload: {
              id: `file-mod-${Date.now()}`,
              type: "file_modified",
              label: `Archivo modificado: ${event.payload.name}`,
              detail,
              status: "done",
              timestamp: Date.now(),
            },
          })
        },
        { target: { kind: "Any" } },
      )
      unlisteners.push(u6)

      const u7 = await listen<{ id: string; tool: string; args?: string }>(
        "agent:tool_call",
        (event) => {
          dispatch({
            type: "ADD_EVENT",
            payload: {
              id: event.payload.id,
              type: "tool_call",
              label: `Usando: ${event.payload.tool}`,
              detail: event.payload.args,
              status: "running",
              timestamp: Date.now(),
            },
          })
        },
        { target: { kind: "Any" } },
      )
      unlisteners.push(u7)

      const u8 = await listen<{ id: string; result?: string }>(
        "agent:tool_result",
        (event) => {
          dispatch({
            type: "UPDATE_EVENT",
            payload: {
              id: event.payload.id,
              changes: {
                status: "done",
                detail: event.payload.result,
              },
            },
          })
        },
        { target: { kind: "Any" } },
      )
      unlisteners.push(u8)

      const u9 = await listen<{ text: string }>(
        "agent:thinking",
        (event) => {
          dispatch({
            type: "ADD_EVENT",
            payload: {
              id: `think-${Date.now()}`,
              type: "thinking",
              label: "Razonando...",
              detail: event.payload.text,
              status: "done",
              timestamp: Date.now(),
            },
          })
        },
        { target: { kind: "Any" } },
      )
      unlisteners.push(u9)

      const u10 = await listen<{ message: string }>(
        "agent:error",
        (event) => {
          dispatch({ type: "SET_ERROR", payload: event.payload.message })
          dispatch({ type: "SET_STATUS", payload: "error" })
        },
        { target: { kind: "Any" } },
      )
      unlisteners.push(u10)

      const u11 = await listen<{ url: string }>(
        "agent:preview_ready",
        (event) => {
          dispatch({
            type: "SET_PREVIEW_URL",
            payload: event.payload.url,
          })
          dispatch({
            type: "ADD_EVENT",
            payload: {
              id: `preview-${Date.now()}`,
              type: "preview_ready",
              label: "Preview lista",
              detail: event.payload.url,
              status: "done",
              timestamp: Date.now(),
            },
          })
        },
        { target: { kind: "Any" } },
      )
      unlisteners.push(u11)

      const u12 = await listen<CleanupReport>(
        "agent:cleanup_result",
        (event) => {
          dispatch({
            type: "SET_CLEANUP_REPORT",
            payload: event.payload,
          })
          dispatch({
            type: "ADD_EVENT",
            payload: {
              id: `cleanup-${Date.now()}`,
              type: "cleanup_result",
              label: "Limpieza completada",
              detail: `${event.payload.removedFiles} archivos eliminados, ${event.payload.unusedImports} imports sin usar`,
              status: "done",
              timestamp: Date.now(),
            },
          })
        },
        { target: { kind: "Any" } },
      )
      unlisteners.push(u12)

      const u13 = await listen<void>(
        "agent:done",
        () => {
          dispatch({ type: "SET_STATUS", payload: "done" })
        },
        { target: { kind: "Any" } },
      )
      unlisteners.push(u13)

      if (cancelled) {
        unlisteners.forEach((fn) => fn())
      }
    }

    setupListeners()

    return () => {
      cancelled = true
      unlisteners.forEach((fn) => fn())
    }
  }, [state.mode, dispatch])

  const startGeneration = React.useCallback(
    async (prompt: string) => {
      dispatch({ type: "SET_STATUS", payload: "thinking" })
      dispatch({ type: "SET_ERROR", payload: null })
      dispatch({ type: "SET_CLEANUP_REPORT", payload: null })

      const projectPath = state.loadedProject
        ? `./agent-projects/${state.loadedProject.name}`
        : "./agent-projects/default"

      try {
        await invoke("coding_agent_start_generation", {
          description: prompt,
          projectPath,
          providerType: activeProvider?.provider ?? "",
          model: activeProvider?.model ?? "",
          endpoint: activeProvider?.endpoint ?? "",
          apiKey: activeProvider?.apiKey ?? null,
          conversationId: conversationId || null,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        dispatch({ type: "SET_ERROR", payload: msg })
        dispatch({ type: "SET_STATUS", payload: "error" })
      }
    },
    [dispatch, state.loadedProject, activeProvider, conversationId],
  )

  const approvePlan = React.useCallback(
    async (plan: CodingAgentPlan) => {
      try {
        await invoke("coding_agent_approve_plan", {
          planJson: JSON.stringify(plan),
          projectPath: state.loadedProject
            ? `./agent-projects/${state.loadedProject.name}`
            : "./agent-projects/default",
          conversationId: conversationId || null,
        })
        dispatch({ type: "APPROVE_PLAN" })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        dispatch({ type: "SET_ERROR", payload: msg })
        dispatch({ type: "SET_STATUS", payload: "error" })
      }
    },
    [dispatch, state.loadedProject, conversationId],
  )

  const rejectPlan = React.useCallback(() => {
    dispatch({ type: "REJECT_PLAN" })
  }, [dispatch])

  const editPlan = React.useCallback(
    async (newInstructions: string) => {
      dispatch({ type: "SET_STATUS", payload: "thinking" })
      const projectPath = state.loadedProject
        ? `./agent-projects/${state.loadedProject.name}`
        : "./agent-projects/default"

      try {
        await invoke("coding_agent_start_generation", {
          description: newInstructions,
          projectPath,
          providerType: activeProvider?.provider ?? "",
          model: activeProvider?.model ?? "",
          endpoint: activeProvider?.endpoint ?? "",
          apiKey: activeProvider?.apiKey ?? null,
          conversationId: conversationId || null,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        dispatch({ type: "SET_ERROR", payload: msg })
        dispatch({ type: "SET_STATUS", payload: "error" })
      }
    },
    [dispatch, state.loadedProject, activeProvider, conversationId],
  )

  const clarify = React.useCallback(
    async (prompt: string) => {
      dispatch({ type: "SET_STATUS", payload: "clarifying" })
      dispatch({ type: "SET_ERROR", payload: null })

      try {
        await invoke("coding_agent_clarify", {
          description: prompt,
          providerType: activeProvider?.provider ?? "",
          model: activeProvider?.model ?? "",
          endpoint: activeProvider?.endpoint ?? "",
          apiKey: activeProvider?.apiKey ?? null,
        })
      } catch (err) {
        // Si falla la generacion de preguntas (ej. sin LLM), ir directo a plan
        startGeneration(prompt)
      }
    },
    [dispatch, activeProvider, startGeneration],
  )

  const submitClarification = React.useCallback(
    async (originalPrompt: string, questions: ClarifyingQuestion[]) => {
      dispatch({ type: "SET_CLARIFYING_QUESTIONS", payload: null })

      const qaContext = questions
        .map((q) => `Pregunta: ${q.question}\nRespuesta: ${q.answer}`)
        .join("\n\n")

      const enrichedPrompt = `${originalPrompt}\n\nContexto adicional:\n${qaContext}`
      await startGeneration(enrichedPrompt)
    },
    [dispatch, startGeneration],
  )

  const resolvePermission = React.useCallback(
    async (requestId: string, granted: boolean) => {
      try {
        await invoke("coding_agent_resolve_permission", {
          requestId,
          granted,
        })
        dispatch({ type: "RESOLVE_PERMISSION_REQUEST", payload: requestId })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        dispatch({ type: "SET_ERROR", payload: msg })
      }
    },
    [dispatch],
  )

  const loadProject = React.useCallback(
    async (path: string) => {
      dispatch({ type: "SET_STATUS", payload: "thinking" })
      try {
        await invoke("coding_agent_load_project", {
          path,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        dispatch({ type: "SET_ERROR", payload: msg })
        dispatch({ type: "SET_STATUS", payload: "error" })
      }
    },
    [dispatch],
  )

  const reset = React.useCallback(() => {
    dispatch({ type: "RESET" })
  }, [dispatch])

  return {
    clarify,
    submitClarification,
    startGeneration,
    approvePlan,
    rejectPlan,
    editPlan,
    resolvePermission,
    loadProject,
    reset,
  }
}
