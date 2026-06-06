import { CheckCircle2Icon, PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/Button"
import type { AiConnector } from "@/features/workspace/workspace-data"
import type { ProviderOption } from "@/features/workspace/ai-containers/provider-options"
import { cn } from "@/lib/utils"

type ProviderOptionCardProps = {
  option: ProviderOption
  connector?: AiConnector
  onSelect: (option: ProviderOption) => void
}

export function ProviderOptionCard({
  option,
  connector,
  onSelect,
}: ProviderOptionCardProps) {
  const Icon = option.icon
  const configured = Boolean(connector)

  return (
    <article className="group flex min-h-56 flex-col rounded-xl border border-border/80 bg-card/95 p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-primary ring-1 ring-border transition group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold">{option.name}</h2>
            {connector ? <StatusBadge status={connector.status} /> : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {connector?.model ?? option.defaultModel}
          </p>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        {option.description}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <MetaPill>{option.type}</MetaPill>
        <MetaPill>{option.role}</MetaPill>
        <MetaPill>{option.auth === "api-key" ? "keychain" : "sin key"}</MetaPill>
      </div>

      <div className="mt-4 flex gap-1.5">
        {option.models.slice(0, 3).map((model) => (
          <span
            key={model}
            className="min-w-0 truncate rounded-md bg-muted px-2 py-1 font-mono text-[0.68rem] text-muted-foreground"
          >
            {model}
          </span>
        ))}
      </div>

      <div className="mt-auto flex justify-end pt-4">
        <Button
          variant={configured ? "outline" : "default"}
          size="sm"
          onClick={() => onSelect(option)}
        >
          {configured ? (
            <CheckCircle2Icon className="size-4" />
          ) : (
            <PlusIcon className="size-4" />
          )}
          {configured ? "Configurar" : "Agregar"}
        </Button>
      </div>
    </article>
  )
}

function StatusBadge({ status }: { status: AiConnector["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-md px-2 text-xs font-medium",
        status === "online" && "bg-emerald-500/10 text-emerald-700",
        status === "offline" && "bg-muted text-muted-foreground",
        status === "needs-key" && "bg-orange-500/10 text-orange-700"
      )}
    >
      {status === "online" ? <CheckCircle2Icon className="size-3" /> : null}
      {status === "needs-key" ? "requiere key" : status}
    </span>
  )
}

function MetaPill({ children }: { children: string }) {
  return (
    <span className="inline-flex h-6 items-center rounded-md border border-border bg-background px-2 text-xs text-muted-foreground">
      {children}
    </span>
  )
}
