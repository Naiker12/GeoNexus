import { RefreshCwIcon } from "lucide-react"

import { MessageBubble } from "@/components/chat/MessageBubble"
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
          {message.trace_id ? (
            <p className="mt-3 text-xs text-muted-foreground">
              trace_id: {message.trace_id}
            </p>
          ) : null}
        </MessageBubble>
      ))}

      {pending ? (
        <MessageBubble role="assistant" eyebrow="GeoNexus IA">
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <RefreshCwIcon className="size-4 animate-spin" />
            Pensando...
          </span>
        </MessageBubble>
      ) : null}
    </div>
  )
}
