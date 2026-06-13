import { GeoAgentsIcon } from "@/components/brand/GeoAgentsIcon"
import { ActionSuggestions } from "@/components/chat/ActionSuggestions"
import { ConnectCard } from "@/components/chat/ConnectCard"
import { CopyButton, TokenStatsBadge } from "@/components/chat/MessageActions"
import { DeepResearchPanel } from "@/components/chat/DeepResearchPanel"
import { CitationsBlock } from "@/components/chat/CitationsBlock"
import { MarkdownContent } from "@/components/chat/MarkdownContent"
import { SearchSourcesBlock } from "@/components/chat/SearchSourcesBlock"
import { TypingDots } from "@/components/chat/TypingDots"
import { parseSuggestions } from "@/utils/parseSuggestions"
import { parseContent, type ConnectCardData } from "@/utils/parseContent"
import type { Message } from "@/types/chat"

interface AssistantMessageProps {
  message: Message
  isStreaming?: boolean
  onSendMessage?: (text: string) => void
  cumulativeContext?: { totalTokens: number; contextWindow: number }
}

export function AssistantMessage({
  message,
  isStreaming,
  onSendMessage,
  cumulativeContext,
}: AssistantMessageProps) {
  const { mainContent, suggestions } = isStreaming
    ? { mainContent: message.content, suggestions: [] as string[] }
    : parseSuggestions(message.content)

  const segments = parseContent(mainContent)

  const showResearch = message.isSearching === true || (message.research_sources?.length ?? 0) > 0

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
          <CopyButton content={message.content} />
        </div>
      </div>
    </div>
  )
}
