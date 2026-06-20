import * as React from "react"
import { FileTextIcon } from "lucide-react"

import { GeoAgentsIcon } from "@/components/brand/GeoAgentsIcon"
import { AssistantMessage } from "@/components/chat/AssistantMessage"
import { MessageBubble } from "@/components/chat/MessageBubble"
import { CopyButton, UserActions } from "@/components/chat/MessageActions"
import type { Message } from "@/types/chat"

type ChatTranscriptProps = {
  messages: Message[]
  pending: boolean
  submitTime?: number | null
  onSendMessage?: (text: string) => void
  webSearchEnabled?: boolean
  onEditLastUserMessage?: () => void
  onRegenerateLastMessage?: () => void
  useContext?: boolean
}

export function ChatTranscript({
  messages,
  pending,
  submitTime,
  onSendMessage,
  onEditLastUserMessage,
  onRegenerateLastMessage,
}: ChatTranscriptProps) {
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const [userScrolledUp, setUserScrolledUp] = React.useState(false)
  const [showScrollBtn, setShowScrollBtn] = React.useState(false)

  const handleScroll = React.useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight
    const isUp = dist > 100
    setUserScrolledUp(isUp)
    setShowScrollBtn(isUp && pending)
  }, [pending])

  const lastAssistantIndex = React.useMemo(() => {
    let idx = -1
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].role === "assistant") idx = i
    }
    return idx
  }, [messages])

  const lastUserIndex = React.useMemo(() => {
    let idx = -1
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].role === "user") idx = i
    }
    return idx
  }, [messages])

  const runningContext = React.useMemo(() => {
    let total = 0
    for (const msg of messages) {
      if (msg.stats) {
        total += msg.stats.input_tokens + msg.stats.output_tokens
      }
    }
    return total
  }, [messages])

  const lastContextWindow = React.useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].stats?.context_window) return messages[i].stats!.context_window
    }
    return 128_000
  }, [messages])

  const lastUserMessage = React.useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") return messages[i].content
    }
    return ""
  }, [messages])

  React.useEffect(() => {
    if (!userScrolledUp && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, pending, userScrolledUp])

  React.useEffect(() => {
    if (!pending) {
      setUserScrolledUp(false)
      setShowScrollBtn(false)
    }
  }, [pending])

  const scrollToBottom = React.useCallback(() => {
    setUserScrolledUp(false)
    setShowScrollBtn(false)
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  return (
    <div
      ref={containerRef}
      className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5 md:px-8 relative"
      onScroll={handleScroll}
    >
      {messages.map((message, index) =>
        message.role === "user" ? (
          <div key={message.id} className="group flex flex-col items-end">
            {message.attachments && message.attachments.length > 0 && (
              <div className="mb-2 flex max-w-full flex-wrap gap-2">
                {message.attachments.map((attachment) => (
                  <div key={attachment.id} className="overflow-hidden rounded-lg border border-border">
                    {attachment.data && attachment.type.startsWith("image/") ? (
                      <img
                        src={attachment.data}
                        alt={attachment.name}
                        className="max-h-48 max-w-full object-contain"
                      />
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2 text-sm">
                        <FileTextIcon className="size-4 text-muted-foreground" />
                        <span className="max-w-xs truncate">{attachment.name}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <MessageBubble role="user">
              <p className="overflow-wrap-anywhere whitespace-pre-wrap break-words">{message.content}</p>
            </MessageBubble>
            <div className="flex items-center gap-0.5 pt-0.5">
              <CopyButton content={message.content} />
              {index === lastUserIndex && (
                <UserActions
                  onEdit={onEditLastUserMessage}
                  onRegenerate={onRegenerateLastMessage}
                />
              )}
            </div>
          </div>
        ) : (
          <div key={message.id} className="flex flex-col gap-1">
            <AssistantMessage
              message={message}
              isStreaming={index === lastAssistantIndex && pending}
              isPending={index === lastAssistantIndex && pending}
              onSendMessage={onSendMessage}
              cumulativeContext={{ totalTokens: runningContext, contextWindow: lastContextWindow }}
            />
          </div>
        ),
      )}

      {pending && lastAssistantIndex === -1 && (
        <div className="flex items-start gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-600/10 text-emerald-600 ring-1 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20">
            <GeoAgentsIcon className="size-4" variant="nexus" />
          </div>
          <div className="flex w-full flex-col gap-2 pt-1.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3.5 py-1.5 text-sm text-stone-500">
              <div className="flex items-center gap-[3px]">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-[5px] w-[5px] rounded-full bg-stone-400"
                    style={{
                      animation: "gn-bounce 1.4s ease-in-out infinite",
                      animationDelay: `${i * 0.16}s`,
                    }}
                  />
                ))}
              </div>
              <span>Pensando</span>
              <style>{`
                @keyframes gn-bounce {
                  0%, 80%, 100% { transform: scale(1); opacity: 0.4; }
                  40%            { transform: scale(1.35); opacity: 1; }
                }
              `}</style>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />

      {showScrollBtn && (
        <button
          type="button"
          className="scroll-to-bottom-btn"
          onClick={scrollToBottom}
        >
          ↓ Respuesta en progreso
        </button>
      )}
    </div>
  )
}
