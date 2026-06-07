import {
  BrainCircuitIcon,
  CloudIcon,
  NetworkIcon,
  TerminalIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

const connectorItems = [
  {
    name: "Ollama",
    role: "Chat principal",
    endpoint: "localhost:11434",
    status: "online" as const,
    icon: TerminalIcon,
  },
  {
    name: "LM Studio",
    role: "Chat alternativo",
    endpoint: "localhost:1234/v1",
    status: "offline" as const,
    icon: TerminalIcon,
  },
  {
    name: "OpenRouter",
    role: "Multi-modelo cloud",
    endpoint: "openrouter.ai/api/v1",
    status: "needs-key" as const,
    icon: CloudIcon,
  },
  {
    name: "Embeddings locales",
    role: "Vectorización",
    endpoint: "localhost:11434",
    status: "online" as const,
    icon: BrainCircuitIcon,
  },
  {
    name: "Memory MCP",
    role: "Memoria semántica",
    endpoint: "localhost:7011",
    status: "online" as const,
    icon: NetworkIcon,
  },
]

const statusLabels: Record<string, { text: string; className: string }> = {
  online: {
    text: "activo",
    className:
      "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  offline: {
    text: "inactivo",
    className:
      "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  },
  "needs-key": {
    text: "revisar",
    className:
      "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
}

export function ConnectorsSection() {
  return (
    <div className="grid gap-4">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-primary">
          Conectores IA
        </h3>
        <p className="mt-1 text-xs leading-4 text-muted-foreground">
          Proveedores, servidores MCP y servicios conectados al workspace.
        </p>
      </div>

      <div className="grid gap-2">
        {connectorItems.map((item) => {
          const badge = statusLabels[item.status]
          return (
            <article
              key={item.name}
              className="flex items-center gap-3 rounded-lg border border-border bg-card/70 px-3 py-2.5"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <item.icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {item.role} · {item.endpoint}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-md px-2 py-0.5 text-[0.65rem] font-medium",
                  badge.className
                )}
              >
                {badge.text}
              </span>
            </article>
          )
        })}
      </div>
    </div>
  )
}
