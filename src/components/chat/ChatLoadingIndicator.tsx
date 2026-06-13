import { BrainCircuitIcon, FileSearchIcon, MessageSquareIcon, NetworkIcon, SearchIcon } from "lucide-react"

export type ChatLoadingPhase =
  | "idle"
  | "classifying"
  | "searching"
  | "generating"
  | "extracting"
  | "done"

const PHASE_CONFIG: Record<ChatLoadingPhase, { label: string; icon: typeof BrainCircuitIcon } | null> = {
  idle: null,
  classifying: { label: "Clasificando consulta...", icon: BrainCircuitIcon },
  searching: { label: "Consultando documentos y contexto...", icon: FileSearchIcon },
  generating: { label: "Generando respuesta...", icon: MessageSquareIcon },
  extracting: { label: "Actualizando grafo de conocimiento...", icon: NetworkIcon },
  done: null,
}

type Props = {
  phase: ChatLoadingPhase
}

export function ChatLoadingIndicator({ phase }: Props) {
  const config = PHASE_CONFIG[phase]
  if (!config) return null

  const Icon = config.icon

  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-muted/30 px-3.5 py-2.5 text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-300">
      <span className="relative flex size-5 shrink-0 items-center justify-center">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/20 opacity-75" />
        <span className="relative inline-flex size-4 items-center justify-center">
          <Icon className="size-4 text-primary" />
        </span>
      </span>
      <span className="font-medium">{config.label}</span>
      <span className="ml-auto flex gap-0.5">
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/40" style={{ animationDelay: "0ms" }} />
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/40" style={{ animationDelay: "150ms" }} />
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/40" style={{ animationDelay: "300ms" }} />
      </span>
    </div>
  )
}
