import { MessageBubble } from "@/components/chat/MessageBubble"
import { ChatAnalysisLoader } from "@/components/chat/ChatAnalysisLoader"
import type { Message } from "@/types/chat"

type ChatTranscriptProps = {
  messages: Message[]
  pending: boolean
}

export function ChatTranscript({ messages, pending }: ChatTranscriptProps) {
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-3 py-6">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          role={message.role === "assistant" ? "assistant" : "user"}
          eyebrow={message.role === "assistant" ? "GeoNexus IA" : "Tu"}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>

          {message.role === "assistant" && message.sources && message.sources.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {message.sources.map((source, i) => (
                <span
                  key={`${source}-${i}`}
                  className="inline-flex items-center gap-1 rounded-full border
                             bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  {source}
                </span>
              ))}
            </div>
          )}

          {message.trace_id ? (
            <p className="mt-3 text-xs text-muted-foreground">
              trace_id: {message.trace_id}
            </p>
          ) : null}
        </MessageBubble>
      ))}

      {pending ? (
        <MessageBubble role="assistant" eyebrow="GeoNexus IA">
          <ChatAnalysisLoader />
        </MessageBubble>
      ) : null}
    </div>
  )
}
