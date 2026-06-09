import { GeoNexusIcon } from "@/components/brand/GeoNexusIcon"
import { ActionSuggestions } from "@/components/chat/ActionSuggestions"
import { MarkdownContent } from "@/components/chat/MarkdownContent"
import { TypingDots } from "@/components/chat/TypingDots"
import { parseSuggestions } from "@/utils/parseSuggestions"

interface AssistantMessageProps {
  content: string
  isStreaming?: boolean
  onSendMessage?: (text: string) => void
}

export function AssistantMessage({
  content,
  isStreaming,
  onSendMessage,
}: AssistantMessageProps) {
  const { mainContent, suggestions } = isStreaming
    ? { mainContent: content, suggestions: [] as string[] }
    : parseSuggestions(content)
  return (
    <div className="flex items-start gap-2 py-0.5">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-600/10 text-emerald-600 ring-1 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20">
        <GeoNexusIcon className="size-3.5" variant="nexus" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[10px] font-medium tracking-widest text-muted-foreground uppercase">
          GeoNexus IA
        </span>
        {isStreaming && content.length === 0 ? (
          <TypingDots />
        ) : (
          <>
            <MarkdownContent content={mainContent} isStreaming={isStreaming} />
            <ActionSuggestions
              suggestions={suggestions}
              onSelect={(s) => onSendMessage?.(s)}
            />
          </>
        )}
      </div>
    </div>
  )
}
