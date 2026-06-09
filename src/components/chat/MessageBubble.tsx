import type React from "react"

import { GeoNexusIcon } from "@/components/brand/GeoNexusIcon"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"

type Finding = {
  title: string
  text: string
}

type MessageBubbleProps = {
  role: "user" | "assistant"
  eyebrow?: string
  children: React.ReactNode
  className?: string
}

type AssistantMessageProps = {
  title: string
  summary: string
  findings?: Finding[]
  warning?: {
    title: string
    text: string
  }
  toolCall?: string
}

export function MessageBubble({
  role,
  eyebrow,
  children,
  className,
}: MessageBubbleProps) {
  const isUser = role === "user"

  return (
    <article
      className={cn(
        "flex items-start gap-2",
        isUser && "flex-row-reverse",
        className
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold shadow-xs",
          isUser
            ? "bg-primary/10 text-primary ring-1 ring-primary/20"
            : "bg-emerald-600/10 text-emerald-600 ring-1 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20"
        )}
      >
        {isUser ? (
          <span>TU</span>
        ) : (
          <GeoNexusIcon className="size-3.5" variant="nexus" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "min-w-0 rounded-2xl px-3.5 py-2.5 text-sm shadow-xs",
          isUser
            ? "max-w-[75%] sm:max-w-sm bg-primary/10 text-foreground"
            : "flex-1 bg-card text-card-foreground ring-1 ring-border/50"
        )}
      >
        {eyebrow ? (
          <p
            className={cn(
              "mb-1 text-[10px] font-semibold uppercase tracking-wider",
              isUser ? "text-primary/60" : "text-emerald-600/60 dark:text-emerald-400/60"
            )}
          >
            {eyebrow}
          </p>
        ) : null}
        <div className="leading-6">{children}</div>
      </div>
    </article>
  )
}

export function AssistantMessage({
  title,
  summary,
  findings = [],
  warning,
  toolCall,
}: AssistantMessageProps) {
  return (
    <MessageBubble role="assistant">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
        <GeoNexusIcon className="size-4" variant="agent" />
        {title}
      </div>
      <p className="mt-3 text-sm font-medium">{summary}</p>

      {findings.length > 0 ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {findings.map((finding) => (
            <FindingCard key={finding.title} {...finding} />
          ))}
        </div>
      ) : null}

      {warning ? (
        <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
          <p className="font-medium text-destructive">{warning.title}</p>
          <p className="mt-1 text-muted-foreground">{warning.text}</p>
        </div>
      ) : null}

      {toolCall ? (
        <div className="mt-4 overflow-hidden rounded-lg border border-border bg-background p-3 font-mono text-xs text-primary">
          {toolCall}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm">Ejecutar buffer 300m</Button>
        <Button variant="outline" size="sm">
          Ver capas relacionadas
        </Button>
      </div>
    </MessageBubble>
  )
}

function FindingCard({ title, text }: Finding) {
  return (
    <div className="rounded-lg border border-border bg-background/80 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
        {title}
      </p>
      <p className="mt-2 text-sm leading-5 text-muted-foreground">{text}</p>
    </div>
  )
}
