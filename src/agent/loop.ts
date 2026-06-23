/** AgentLoop — orchestrates the AI agent lifecycle (inspired by Hermes agent/). */

export type AgentEventType =
  | "delta"           // streaming text delta
  | "thinking_start"  // thinking/reasoning block started
  | "thinking_delta"  // thinking content delta
  | "thinking_end"    // thinking block ended
  | "tool_call"       // tool invocation
  | "tool_result"     // tool execution result
  | "error"           // error during execution
  | "done"            // response complete

export interface AgentEvent {
  type: AgentEventType
  payload: unknown
  conversationId?: string
  timestamp: number
}

export type AgentEventCallback = (event: AgentEvent) => void

export interface AgentConfig {
  provider: string
  model: string
  endpoint: string
  apiKey?: string
  skillNames?: string[]
}

export class AgentLoop {
  private callbacks: Set<AgentEventCallback> = new Set()
  private config: AgentConfig
  private abortController: AbortController | null = null

  constructor(config: AgentConfig) {
    this.config = config
  }

  onEvent(cb: AgentEventCallback): () => void {
    this.callbacks.add(cb)
    return () => this.callbacks.delete(cb)
  }

  private emit(type: AgentEventType, payload: unknown, conversationId?: string) {
    const event: AgentEvent = { type, payload, conversationId, timestamp: Date.now() }
    this.callbacks.forEach((cb) => cb(event))
  }

  async send(
    conversationId: string,
    content: string,
    options?: { signal?: AbortSignal; skillNames?: string[] }
  ): Promise<void> {
    this.abortController = new AbortController()
    const signal = options?.signal ?? this.abortController.signal

    try {
      const { invoke } = await import("@tauri-apps/api/core")
      this.emit("thinking_start", { phase: "reasoning" }, conversationId)

      const response = await invoke<{ content: string }>("send_message", {
        input: {
          project_id: "project-default",
          conversation_id: conversationId,
          content,
          provider: this.config.provider,
          model: this.config.model,
          endpoint: this.config.endpoint,
          api_key: this.config.apiKey ?? null,
          skill_names: this.config.skillNames ?? options?.skillNames ?? [],
          use_context: true,
          max_context_chunks: 4,
        },
      })

      this.emit("delta", { text: response.content }, conversationId)
      this.emit("done", { conversationId }, conversationId)
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        this.emit("error", { message: String(err) }, conversationId)
      }
    }
  }

  abort() {
    this.abortController?.abort()
  }
}
