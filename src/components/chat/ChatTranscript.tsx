import * as React from "react"

import { GeoNexusIcon } from "@/components/brand/GeoNexusIcon"
import { AssistantMessage } from "@/components/chat/AssistantMessage"
import { MessageBubble } from "@/components/chat/MessageBubble"
import { CopyButton, UserActions } from "@/components/chat/MessageActions"
import {
  ThinkingInline,
  DEFAULT_THINKING_STEPS,
} from "@/components/chat/ThinkingInline"
import type { ThinkingStep } from "@/components/chat/ThinkingInline"
import type { Message, MessageStats } from "@/types/chat"

type ChatTranscriptProps = {
  messages: Message[]
  pending: boolean
  onSendMessage?: (text: string) => void
  webSearchEnabled?: boolean
  onEditLastUserMessage?: () => void
  onRegenerateLastMessage?: () => void
}

function useThinkingSteps(pending: boolean) {
  const [stepIndex, setStepIndex] = React.useState(0)

  React.useEffect(() => {
    if (pending) {
      setStepIndex(0)
      const timer = setInterval(() => {
        setStepIndex((prev) =>
          Math.min(prev + 1, DEFAULT_THINKING_STEPS.length - 1)
        )
      }, 1800)
      return () => clearInterval(timer)
    } else {
      setStepIndex(DEFAULT_THINKING_STEPS.length)
    }
  }, [pending])

  const steps: ThinkingStep[] = React.useMemo(
    () =>
      DEFAULT_THINKING_STEPS.map((step, i) => ({
        ...step,
        status:
          i < stepIndex ? "done" : i === stepIndex ? "active" : "pending",
      })),
    [stepIndex]
  )

  const isComplete = stepIndex >= DEFAULT_THINKING_STEPS.length

  return { steps, isComplete }
}

export function ChatTranscript({
  messages,
  pending,
  onSendMessage,
  webSearchEnabled,
  onEditLastUserMessage,
  onRegenerateLastMessage,
}: ChatTranscriptProps) {
  const { steps, isComplete } = useThinkingSteps(pending)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

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

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, pending])

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5 md:px-8">
      {messages.map((message, index) =>
        message.role === "user" ? (
          <div key={message.id} className="group flex flex-col items-end">
            <MessageBubble role="user">
              <p className="whitespace-pre-wrap">{message.content}</p>
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
          <AssistantMessage
            key={message.id}
            message={message}
            isStreaming={false}
            onSendMessage={onSendMessage}
            cumulativeContext={{ totalTokens: runningContext, contextWindow: lastContextWindow }}
          />
        )
      )}

      {pending ? (
        <div className="flex items-start gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-600/10 text-emerald-600 ring-1 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20">
            <GeoNexusIcon className="size-4" variant="nexus" />
          </div>
          <div className="flex flex-col gap-1 pt-1.5">
            <ThinkingInline steps={steps} isComplete={isComplete} />
          </div>
        </div>
      ) : null}

      <div ref={messagesEndRef} />
    </div>
  )
}
