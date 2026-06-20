import * as React from "react"
import {
  ActivityIcon,
  BrainCircuitIcon,
  GlobeIcon,
  LinkIcon,
  MessageSquareTextIcon,
  UploadIcon,
  XIcon,
} from "lucide-react"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import { nodeDotColor } from "./NodeSheet"
import { nodeTypeLabel } from "./graph-colors"
import type { GraphNode } from "@/types/data"

function eventIcon(source_event: string) {
  switch (source_event) {
    case "chat": return MessageSquareTextIcon
    case "upload": return UploadIcon
    case "sync": return LinkIcon
    case "rag": return BrainCircuitIcon
    case "web_search": return GlobeIcon
    default: return ActivityIcon
  }
}

function formatTime(unix: number): string {
  const diff = Date.now() / 1000 - unix
  if (diff < 60) return "ahora"
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

export function GraphActivityPanel({
  events,
  open,
  onOpenChange,
  onClearEphemeral,
}: {
  events: GraphNode[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onClearEphemeral: () => void
}) {
  if (!open) return null

  return (
    <div className="absolute right-3 top-12 z-30 w-72 rounded-lg border border-border bg-card/95 shadow-lg backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <ActivityIcon className="size-3" />
          Actividad reciente
        </span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[0.65rem]" onClick={onClearEphemeral}>
            Limpiar efímeros
          </Button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <XIcon className="size-3.5" />
          </button>
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto p-2 [scrollbar-width:thin]">
        {events.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            Sin actividad reciente
          </p>
        ) : (
          events.map((node) => {
            const Icon = eventIcon(node.source_event)
            return (
              <div
                key={node.id}
                className="flex items-start gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-accent/50"
              >
                <div className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full", nodeDotColor(node.kind))}>
                  <Icon className="size-3 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">
                    {node.label}
                  </p>
                  <p className="text-[0.65rem] text-muted-foreground">
                    {nodeTypeLabel(node.kind)} · {formatTime(node.created_at)}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
