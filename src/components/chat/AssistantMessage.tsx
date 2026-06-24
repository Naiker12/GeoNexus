import { LoaderCircleIcon } from "lucide-react"
import { GeoAgentsIcon } from "@/components/brand/GeoAgentsIcon"
import { ActionSuggestions } from "@/components/chat/ActionSuggestions"
import { ConnectCard } from "@/components/chat/ConnectCard"
import { McpConnectCard } from "@/components/chat/McpConnectCard"
import { CopyButton, TokenStatsBadge } from "@/components/chat/MessageActions"
import { DeepResearchPanel } from "@/components/chat/DeepResearchPanel"
import { CitationsBlock } from "@/components/chat/CitationsBlock"
import { MarkdownContent } from "@/components/chat/MarkdownContent"
import { SearchSourcesBlock } from "@/components/chat/SearchSourcesBlock"

import { ThinkingCard, useReasoningStream } from "@/components/chat/reasoning"
import { parseSuggestions } from "@/utils/parseSuggestions"
import { parseContent, type ConnectCardData, type McpConnectCardData } from "@/utils/parseContent"
import type { Message } from "@/types/chat"
import { AnimatePresence, motion } from "framer-motion"

interface AssistantMessageProps {
  message: Message
  isStreaming?: boolean
  isPending?: boolean
  onSendMessage?: (text: string) => void
  cumulativeContext?: { totalTokens: number; contextWindow: number }
}

export function AssistantMessage({
  message,
  isStreaming,
  isPending,
  onSendMessage,
  cumulativeContext,
}: AssistantMessageProps) {
  const { text: reasoningText, isStreaming: reasoningStreaming, durationMs } = useReasoningStream(isStreaming ? message.conversation_id ?? null : null)

  const reasoningToDisplay = isStreaming ? reasoningText : (message.reasoning_content ?? reasoningText)

  const { mainContent, suggestions } = isStreaming
    ? { mainContent: message.content, suggestions: [] as string[] }
    : parseSuggestions(message.content)

  const segments = parseContent(mainContent)

  const showResearch = message.isSearching === true || (message.research_sources?.length ?? 0) > 0

  const hasContent = (message.content?.length ?? 0) > 0

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

        {/* ─── RAZONAMIENTO EN VIVO ─── */}
      {reasoningToDisplay || reasoningStreaming ? (
        <ThinkingCard
          content={reasoningToDisplay}
          isStreaming={reasoningStreaming}
          durationMs={isStreaming ? durationMs : message.reasoning_duration_ms}
        />
      ) : (isPending || isStreaming) ? (
        <div className="flex items-center gap-2 px-1 py-2 text-sm text-muted-foreground">
          <LoaderCircleIcon className="size-3.5 animate-spin" />
          <span>Pensando...</span>
        </div>
      ) : null}

        {/* ─── RESPUESTA PRINCIPAL con crossfade ─── */}
        <AnimatePresence mode="wait">
          {!hasContent && (reasoningStreaming || isStreaming) ? null : (
            <motion.div
              key="response"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* Citas ChromaDB */}
        {message.sources && message.sources.length > 0 && (
          <SearchSourcesBlock sources={message.sources} />
        )}
        {message.chunk_references && message.chunk_references.length > 0 && (
          <CitationsBlock chunks={message.chunk_references} />
        )}
        <ActionSuggestions
          suggestions={suggestions}
          onSelect={(s) => onSendMessage?.(s)}
        />

        <div className="flex items-center gap-1 pt-0.5">
          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
            Geo Agents
          </span>
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
