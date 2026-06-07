import { Loader2Icon, PlayIcon, Settings2Icon } from "lucide-react"

import { Button } from "@/components/ui/Button"
import { ProviderBrandIcon } from "@/features/workspace/ai-containers/ProviderBrandIcon"
import type { ProviderOption } from "@/features/workspace/ai-containers/provider-options"
import type { AiConnector } from "@/features/workspace/workspace-data"
import { cn } from "@/lib/utils"

type ProviderCardItemProps = {
  option: ProviderOption
  connector?: AiConnector
  isTesting?: boolean
  onConfig: (option: ProviderOption) => void
  onTest: (option: ProviderOption) => void
}

export function ProviderCardItem({
  option,
  connector,
  isTesting,
  onConfig,
  onTest,
}: ProviderCardItemProps) {
  const status = connector?.status ?? "needs-key"

  return (
    <article className="group flex flex-col rounded-lg border border-border/80 bg-card/95 px-3 py-2.5 shadow-sm backdrop-blur transition hover:border-primary/30 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-primary ring-1 ring-border">
          <ProviderBrandIcon
            providerId={option.id}
            fallback={option.icon}
            className="size-4"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="truncate text-sm font-semibold">{option.name}</h2>
            <StatusBadge status={status} />
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {option.models[0]} · {option.models[1] ?? option.role}
          </p>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <MetaPill>{option.type}</MetaPill>
        <MetaPill>{option.role}</MetaPill>
        <MetaPill>{option.auth === "api-key" ? "keychain" : "sin key"}</MetaPill>
        {option.models.slice(0, 2).map((model) => (
          <MetaPill key={model} className="font-mono">
            {model}
          </MetaPill>
        ))}
      </div>

      <div className="mt-2.5 flex items-end justify-between gap-2">
        <span className="truncate font-mono text-[0.68rem] text-muted-foreground/80">
          {connector?.endpoint ?? option.defaultEndpoint}
        </span>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 bg-background"
            onClick={() => onConfig(option)}
          >
            <Settings2Icon className="size-3.5" />
            Config
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 bg-background"
            disabled={isTesting}
            onClick={() => onTest(option)}
          >
            {isTesting ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <PlayIcon className="size-3.5" />
            )}
            Test
          </Button>
        </div>
      </div>
    </article>
  )
}

function StatusBadge({ status }: { status: AiConnector["status"] | "needs-key" }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1.5 rounded-md px-1.5 text-[0.65rem] font-medium uppercase tracking-wide",
        status === "online" &&
          "bg-emerald-500/15 text-emerald-700 [.geo-dark_&]:text-emerald-400 [.graphite_&]:text-emerald-400 [.midnight_&]:text-emerald-400",
        status === "offline" && "bg-muted text-muted-foreground",
        status === "needs-key" &&
          "bg-orange-500/15 text-orange-700 [.geo-dark_&]:text-orange-400 [.graphite_&]:text-orange-400 [.midnight_&]:text-orange-400"
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          status === "online" && "bg-emerald-500",
          status === "offline" && "bg-muted-foreground/50",
          status === "needs-key" && "bg-orange-500"
        )}
      />
      {status === "needs-key" ? "requiere key" : status}
    </span>
  )
}

function MetaPill({
  children,
  className,
}: {
  children: string
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-md bg-muted px-2 text-[0.7rem] text-muted-foreground",
        className
      )}
    >
      {children}
    </span>
  )
}
