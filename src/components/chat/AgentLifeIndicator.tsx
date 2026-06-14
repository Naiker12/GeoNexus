import { GeoAgentsIcon } from "@/components/brand/GeoAgentsIcon"
import { cn } from "@/lib/utils"

type AgentStatus = "idle" | "thinking" | "using_skill" | "searching" | "done"

interface AgentLifeIndicatorProps {
  status: AgentStatus
  skillName?: string
  conversationCount?: number
}

const STATUS_TEXT: Record<AgentStatus, string> = {
  idle: "Listo para analizar",
  thinking: "Procesando...",
  using_skill: "Aplicando",
  searching: "Buscando en web...",
  done: "Listo para analizar",
}

export function AgentLifeIndicator({ status, skillName, conversationCount }: AgentLifeIndicatorProps) {
  return (
    <div className="flex items-center gap-2 px-1">
      <div className="flex size-5 items-center justify-center">
        <GeoAgentsIcon className="size-4" variant="nexus" />
      </div>
      <span className="text-[11px] font-medium text-muted-foreground/80">
        GEO AGENTS
      </span>
      <span className="text-[11px] text-muted-foreground/40">·</span>
      <span className={cn(
        "text-[11px]",
        status === "thinking" && "text-emerald-500 font-medium",
        status === "searching" && "text-blue-500 font-medium",
        status === "using_skill" && "text-amber-500 font-medium",
        status === "idle" && "text-muted-foreground/60",
        status === "done" && "text-muted-foreground/60"
      )}>
        {status === "using_skill" && skillName
          ? `Aplicando ${skillName}...`
          : STATUS_TEXT[status]
        }
      </span>
      {status === "thinking" && (
        <span className="flex gap-0.5">
          <span className="size-1 animate-bounce rounded-full bg-emerald-500/60" style={{ animationDelay: "0ms" }} />
          <span className="size-1 animate-bounce rounded-full bg-emerald-500/60" style={{ animationDelay: "150ms" }} />
          <span className="size-1 animate-bounce rounded-full bg-emerald-500/60" style={{ animationDelay: "300ms" }} />
        </span>
      )}
      {conversationCount && conversationCount > 0 ? (
        <span className="ml-auto text-[10px] text-muted-foreground/30">
          Conversación #{conversationCount}
        </span>
      ) : null}
    </div>
  )
}
