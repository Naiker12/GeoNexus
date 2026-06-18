import { GeoAgentsIcon } from "@/components/brand/GeoAgentsIcon"
import { ActionSuggestions } from "@/components/chat/ActionSuggestions"
import { ConnectCard } from "@/components/chat/ConnectCard"
import { McpConnectCard } from "@/components/chat/McpConnectCard"
import { CopyButton, TokenStatsBadge } from "@/components/chat/MessageActions"
import { DeepResearchPanel } from "@/components/chat/DeepResearchPanel"
import { CitationsBlock } from "@/components/chat/CitationsBlock"
import { MarkdownContent } from "@/components/chat/MarkdownContent"
import { SearchSourcesBlock } from "@/components/chat/SearchSourcesBlock"
import { TypingDots } from "@/components/chat/TypingDots"
import { ThinkingPill, PipelineTrace, ThinkingBlock, ToolCallTrace } from "@/components/chat/reasoning"
import type { PipelineState, ToolCallRecord } from "@/components/chat/reasoning"
import { parseSuggestions } from "@/utils/parseSuggestions"
import { parseContent, type ConnectCardData, type McpConnectCardData } from "@/utils/parseContent"
import type { Message } from "@/types/chat"

interface AssistantMessageProps {
  message: Message
  isStreaming?: boolean
  isPending?: boolean
  pipeline?: PipelineState | null
  onSendMessage?: (text: string) => void
  cumulativeContext?: { totalTokens: number; contextWindow: number }
  thinkingText?: string
  toolCalls?: ToolCallRecord[]
}

const toolCallFromMessage = (msg: Message): ToolCallRecord[] => {
  if (!msg.tool_calls || msg.tool_calls.length === 0) return []
  return (msg.tool_calls as Array<{ tool_name?: string; name?: string; args?: string; result?: string; duration_ms?: number; error?: string }>).map((tc, i) => ({
    id: `msg-tc-${i}`,
    toolName: tc.tool_name ?? tc.name ?? "unknown",
    args: (() => {
      try { return tc.args ? JSON.parse(tc.args) : {} } catch { return {} }
    })(),
    resultSummary: tc.result ?? undefined,
    durationMs: tc.duration_ms ?? undefined,
    status: (tc.error ? "error" : tc.result ? "done" : "pending") as ToolCallRecord["status"],
  }))
}

export function AssistantMessage({
  message,
  isStreaming,
  isPending,
  pipeline,
  onSendMessage,
  cumulativeContext,
  thinkingText,
  toolCalls,
}: AssistantMessageProps) {
  const { mainContent, suggestions } = isStreaming
    ? { mainContent: message.content, suggestions: [] as string[] }
    : parseSuggestions(message.content)

  const segments = parseContent(mainContent)

  const showResearch = message.isSearching === true || (message.research_sources?.length ?? 0) > 0

  const hasContent = message.content.length > 0
  const msgToolCalls = toolCalls && toolCalls.length > 0 ? toolCalls : toolCallFromMessage(message)
  const hasThinking = thinkingText && thinkingText.length > 0

  return (
    <div className="group flex items-start gap-2 py-0.5">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-600/10 text-emerald-600 ring-1 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20">
        <GeoAgentsIcon className="size-3.5" variant="nexus" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="mb-0.5">
          <span className="text-[10px] font-medium tracking-widest text-muted-foreground uppercase">
            Geo Agents
          </span>
        </div>

        {/* Estado A: ThinkingPill — solo mientras espera, sin pipeline aún */}
        {isPending && !pipeline && <ThinkingPill />}

        {/* Estados B+C: PipelineTrace — bloque unificado */}
        {pipeline && <PipelineTrace pipeline={pipeline} />}

        {/* ─── RESPUESTA PRINCIPAL (siempre primero) ─── */}
        {isStreaming && !hasContent ? (
          <TypingDots />
        ) : (
          <>
            {showResearch && (
              <DeepResearchPanel
                sources={message.research_sources ?? []}
                isSearching={message.isSearching ?? false}
                currentQuery={message.currentSearchQuery}
                elapsedSeconds={message.searchElapsedSeconds}
              />
            )}
            {segments.map((seg, i) =>
              seg.kind === "connect_card" ? (
                <ConnectCard
                  key={`card-${i}`}
                  connectorId={(seg.value as ConnectCardData).connectorId}
                  reason={(seg.value as ConnectCardData).reason}
                />
              ) : seg.kind === "mcp_connect_card" ? (
                <McpConnectCard
                  key={`mcp-card-${i}`}
                  serverId={(seg.value as McpConnectCardData).serverId}
                  serverName={(seg.value as McpConnectCardData).serverName}
                  serverUrl={(seg.value as McpConnectCardData).serverUrl}
                  reason={(seg.value as McpConnectCardData).reason}
                  onConnect={() => {
                    const event = new CustomEvent("geonexus:open-mcp-register", {
                      detail: seg.value,
                    })
                    window.dispatchEvent(event)
                  }}
                />
              ) : (
                <MarkdownContent key={`text-${i}`} content={seg.value as string} isStreaming={isStreaming && i === segments.length - 1} />
              ),
            )}
          </>
        )}

        {/* Tool calls inline — bajo la respuesta */}
        {msgToolCalls.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {msgToolCalls.map((tc) => (
              <ToolCallTrace key={tc.id} record={tc} />
            ))}
          </div>
        )}

        {/* ThinkingBlock — razonamiento LLM colapsado, bajo tool calls */}
        {hasThinking && (
          <ThinkingBlock
            content={thinkingText}
            tokenCount={(message as any).stats?.thinkingTokens}
            isStreaming={isStreaming}
          />
        )}

        {/* Citas ChromaDB */}
        {message.sources && message.sources.length > 0 && (
          <SearchSourcesBlock sources={message.sources} />
        )}
        {message.chunk_references && message.chunk_references.length > 0 && (
          <CitationsBlock chunks={message.chunk_references} />
        )}
        {message.tool_calls && (message.tool_calls as Array<{ tool_name: string }>).length > 0 && (
          <div className="mt-1 flex flex-col gap-1.5">
            {(message.tool_calls as Array<{ tool_name: string; server_id?: string; args?: string; result?: string; duration_ms?: number }>).map((tc, i) => (
              <div key={`${tc.tool_name}-${i}`} className="rounded border border-stone-200 bg-stone-50 px-3 py-2 text-[12px] text-stone-500">
                {tc.tool_name}{(tc as any).result ? " ✓" : ""}
              </div>
            ))}
          </div>
        )}
        <ActionSuggestions
          suggestions={suggestions}
          onSelect={(s) => onSendMessage?.(s)}
        />

        <div className="flex items-center gap-1 pt-0.5">
          {message.stats && (
            <TokenStatsBadge
              stats={message.stats}
              provider={message.provider ?? undefined}
              model={message.model ?? undefined}
              cumulativeContext={cumulativeContext}
            />
          )}
          <CopyButton content={message.content} />
        </div>
      </div>
    </div>
  )
}
