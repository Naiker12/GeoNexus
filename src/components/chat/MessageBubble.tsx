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
        "rounded-lg border p-4 text-sm shadow-sm backdrop-blur",
        isUser
          ? "ml-auto max-w-2xl border-border bg-muted/95 text-foreground"
          : "max-w-3xl border-border bg-card/95 text-card-foreground",
        className
      )}
    >
      {eyebrow ? (
        <p className="text-xs font-medium uppercase tracking-wide text-primary">
          {eyebrow}
        </p>
      ) : null}
      <div className={cn(eyebrow && "mt-2", "leading-6")}>{children}</div>
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
    <MessageBubble role="assistant" className="p-5">
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
