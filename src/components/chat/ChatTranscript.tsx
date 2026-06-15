import * as React from "react"

import { GeoAgentsIcon } from "@/components/brand/GeoAgentsIcon"
import { AssistantMessage } from "@/components/chat/AssistantMessage"
import { MessageBubble } from "@/components/chat/MessageBubble"
import { CopyButton, UserActions } from "@/components/chat/MessageActions"
import { ReasoningPanel } from "@/components/chat/ReasoningPanel"
import { useReasoningStream } from "@/components/chat/useReasoningStream"
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
  lastIntent?: string
}

export function ChatTranscript({
  messages,
  pending,
  submitTime,
  onSendMessage,
  webSearchEnabled,
  onEditLastUserMessage,
  onRegenerateLastMessage,
  useContext,
  lastIntent,
}: ChatTranscriptProps) {
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const { steps, isReasoning } = useReasoningStream()

  // --- Smart scroll: detect if user scrolled up manually ---
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

  // Auto-scroll ONLY if user hasn't scrolled up
  React.useEffect(() => {
    if (!userScrolledUp && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, pending, userScrolledUp])

  // Reset scroll lock when response completes
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
            <MessageBubble role="user">
              <p className="whitespace-pre-wrap break-words overflow-wrap-anywhere">{message.content}</p>
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
              onSendMessage={onSendMessage}
              cumulativeContext={{ totalTokens: runningContext, contextWindow: lastContextWindow }}
              reasoningSteps={steps}
              isReasoning={isReasoning}
              reasoningStartTime={submitTime ?? null}
              intent={lastIntent}
              userQuery={lastUserMessage}
            />
          </div>
        )
      )}

      {/* If pending but no assistant message placeholder yet, show reasoning standalone */}
      {pending && lastAssistantIndex === -1 && (
        <div className="flex items-start gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-600/10 text-emerald-600 ring-1 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20">
            <GeoAgentsIcon className="size-4" variant="nexus" />
          </div>
          <div className="flex flex-col gap-2 pt-1.5 w-full">
            <ReasoningPanel
              steps={steps}
              isRunning={isReasoning}
              startTime={submitTime ?? null}
              intent={lastIntent}
              userQuery={lastUserMessage}
            />
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />

      {/* Floating "back to bottom" button when user scrolled up during generation */}
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
