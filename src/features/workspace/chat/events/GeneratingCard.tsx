import { Loader2Icon, CheckCircle2Icon } from "lucide-react"
import { useStreamPreview } from "../hooks/useStreamPreview"
import type { GeneratingStreamEvent } from "@/types/chat"

interface Props {
  event: GeneratingStreamEvent
}

export function GeneratingCard({ event }: Props) {
  const preview = useStreamPreview(event.event_id)
  const isGenerating = event.status === "running"
  const text = preview.accumulated_text

  if (event.status === "complete") return null

  return (
    <div className="w-full overflow-hidden rounded-lg border border-border/50 bg-card text-xs">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Loader2Icon className="size-3.5 shrink-0 animate-spin text-primary" />
        <span className="font-semibold text-foreground/90">Generando respuesta</span>
        <span className="animate-pulse text-muted-foreground">·</span>
      </div>

      {text && (
        <div className="border-t border-border/30 bg-muted/10 px-3 py-2.5">
          <p className="whitespace-pre-wrap leading-relaxed text-foreground/70 line-clamp-6">
            {text}
            <span className="ml-[1px] inline-block h-[11px] w-[2px] animate-pulse align-middle bg-primary/70" />
          </p>
        </div>
      )}
    </div>
  )
}
