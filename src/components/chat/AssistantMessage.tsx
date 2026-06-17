import { GeoAgentsIcon } from "@/components/brand/GeoAgentsIcon"
import { ActionSuggestions } from "@/components/chat/ActionSuggestions"
import { ConnectCard } from "@/components/chat/ConnectCard"
import { McpConnectCard } from "@/components/chat/McpConnectCard"
import { CopyButton, TokenStatsBadge } from "@/components/chat/MessageActions"
import { DeepResearchPanel } from "@/components/chat/DeepResearchPanel"
import { ReasoningPanel } from "@/components/chat/ReasoningPanel"
import { CitationsBlock } from "@/components/chat/CitationsBlock"
import { McpToolCallCard } from "@/components/chat/McpToolCallCard"
import { MarkdownContent } from "@/components/chat/MarkdownContent"
import { SearchSourcesBlock } from "@/components/chat/SearchSourcesBlock"
import { TypingDots } from "@/components/chat/TypingDots"
import { VoicePlayer } from "@/components/chat/VoicePlayer"
import { parseSuggestions } from "@/utils/parseSuggestions"
import { parseContent, type ConnectCardData, type McpConnectCardData } from "@/utils/parseContent"
import type { Message, ReasoningStepDisplay, ToolCallDisplay } from "@/types/chat"

interface AssistantMessageProps {
  message: Message
  isStreaming?: boolean
  onSendMessage?: (text: string) => void
  cumulativeContext?: { totalTokens: number; contextWindow: number }
  reasoningSteps?: ReasoningStepDisplay[]
  isReasoning?: boolean
  reasoningStartTime?: number | null
  intent?: string
  userQuery?: string
  thinkingText?: string
  toolCalls?: ToolCallDisplay[]
}

export function AssistantMessage({
  message,
  isStreaming,
  onSendMessage,
  cumulativeContext,
  reasoningSteps,
  isReasoning,
  reasoningStartTime,
  intent,
  userQuery,
  thinkingText,
  toolCalls,
}: AssistantMessageProps) {
  const { mainContent, suggestions } = isStreaming
    ? { mainContent: message.content, suggestions: [] as string[] }
    : parseSuggestions(message.content)

  const segments = parseContent(mainContent)

  const showResearch = message.isSearching === true || (message.research_sources?.length ?? 0) > 0

  return (
    <div className="group flex items-start gap-2 py-0.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-600/10 text-emerald-600 ring-1 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20">
        <GeoAgentsIcon className="size-3.5" variant="nexus" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="mb-0.5">
            <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase opacity-70">
              Geo Agents
            </span>
          </div>
        {isStreaming && (
        (reasoningSteps && reasoningSteps.length > 0) || 
        isReasoning || 
        (thinkingText && thinkingText.length > 0) || 
        (toolCalls && toolCalls.length > 0)
    ) ? (
          <ReasoningPanel
            steps={reasoningSteps ?? []}
            isRunning={isReasoning ?? false}
            startTime={reasoningStartTime ?? null}
            intent={intent}
            userQuery={userQuery}
            thinkingText={thinkingText}
            toolCalls={toolCalls}
          />
        ) : null}
        {isStreaming && message.content.length === 0 ? (
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
                    // Trigger opening MCP register dialog
                    const event = new CustomEvent("geonexus:open-mcp-register", {
                      detail: seg.value,
                    })
                    window.dispatchEvent(event)
                  }}
                />
              ) : (
                <MarkdownContent key={`text-${i}`} content={seg.value as string} isStreaming={isStreaming && i === segments.length - 1} />
              )
            )}
            {message.sources && message.sources.length > 0 && (
              <SearchSourcesBlock sources={message.sources} />
            )}
            {message.chunk_references && message.chunk_references.length > 0 && (
              <CitationsBlock chunks={message.chunk_references} />
            )}
            {message.tool_calls && (message.tool_calls as Array<{tool_name: string}>).length > 0 && (
              <div className="flex flex-col gap-1.5 mt-1">
                {(message.tool_calls as Array<{tool_name: string; server_id?: string; args?: string; result?: string; duration_ms?: number}>).map((tc, i) => (
                  <McpToolCallCard key={`${tc.tool_name}-${i}`} tool={tc} />
                ))}
              </div>
            )}
            <ActionSuggestions
              suggestions={suggestions}
              onSelect={(s) => onSendMessage?.(s)}
            />
          </>
        )}
        <div className="flex items-center gap-1 pt-0.5">
          {message.stats && (
            <TokenStatsBadge
              stats={message.stats}
              provider={message.provider ?? undefined}
              model={message.model ?? undefined}
              cumulativeContext={cumulativeContext}
            />
          )}
          <VoicePlayer text={message.content} />
          <CopyButton content={message.content} />
        </div>
      </div>
    </div>
  )
}
