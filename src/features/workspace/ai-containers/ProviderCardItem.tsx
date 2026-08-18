import { Loader2Icon, PlayIcon, Settings2Icon, Trash2Icon } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/Button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { ProviderBrandIcon } from "@/features/workspace/ai-containers/ProviderBrandIcon"
import type { ProviderOption } from "@/features/workspace/ai-containers/provider-options"
import { cn } from "@/lib/utils"
import type { AiConnector } from "@/types/workspace-types"

type ProviderCardItemProps = {
  option: ProviderOption
  connector?: AiConnector
  isTesting?: boolean
  onConfig: (option: ProviderOption) => void
  onTest: (option: ProviderOption) => void
  onDelete: (option: ProviderOption) => void
}

export function ProviderCardItem({
  option,
  connector,
  isTesting,
  onConfig,
  onTest,
  onDelete,
}: ProviderCardItemProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const status = connector?.status ?? "needs-key"
  const primaryModel = connector?.model || "Sin modelo"
  const endpoint = connector?.endpoint || "Sin endpoint"

  return (
    <article className="group flex flex-col rounded-2xl border border-border/70 bg-card/85 p-3.5 shadow-2xs backdrop-blur transition hover:border-primary/40 hover:shadow-xs">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted/80 text-foreground border border-border/60">
          <ProviderBrandIcon providerId={option.id} fallback={option.icon} className="size-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="truncate text-xs font-semibold text-foreground">{option.name}</h2>
            <StatusBadge status={status} />
          </div>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground font-mono">
            {primaryModel}
          </p>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <MetaPill>{option.category === "local" ? "Local" : option.category === "gateway" ? "Gateway" : "Cloud"}</MetaPill>
        <MetaPill>{option.auth === "api-key" ? "API Key" : "Sin key"}</MetaPill>
        <MetaPill className="font-mono">{primaryModel}</MetaPill>
      </div>

      <div className="mt-3 pt-2.5 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span className="truncate font-mono text-[10px] text-muted-foreground/80">
          {endpoint}
        </span>
        <div className="flex shrink-0 gap-1.5 self-end sm:self-auto">
          <Button
            variant="outline"
            size="xs"
            className="rounded-lg h-6.5 text-[11px] gap-1"
            onClick={() => onConfig(option)}
          >
            <Settings2Icon className="size-3" />
            Config
          </Button>
          <Button
            variant="outline"
            size="xs"
            className="rounded-lg h-6.5 text-[11px] gap-1"
            disabled={isTesting}
            onClick={() => onTest(option)}
          >
            {isTesting ? (
              <Loader2Icon className="size-3 animate-spin" />
            ) : (
              <PlayIcon className="size-3" />
            )}
            Test
          </Button>
          <Button
            variant="ghost"
            size="xs"
            className="rounded-lg h-6.5 text-[11px] text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2Icon className="size-3" />
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar proveedor"
        description={
          <>
            ¿Eliminar <strong>{option.name}</strong>? Se borrarán la API key, el endpoint y todos
            los modelos asociados. Esta acción no se puede deshacer.
          </>
        }
        onConfirm={() => onDelete(option)}
      />
    </article>
  )
}

function StatusBadge({ status }: { status: AiConnector["status"] | "needs-key" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.2 text-[9px] font-mono font-semibold uppercase tracking-wider",
        status === "online" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
        status === "offline" && "bg-muted text-muted-foreground border border-border/60",
        status === "needs-key" && "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          status === "online" && "bg-emerald-500",
          status === "offline" && "bg-muted-foreground/50",
          status === "needs-key" && "bg-amber-500"
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
        "inline-flex items-center rounded-lg bg-muted/50 border border-border/50 px-2 py-0.5 text-[10px] text-muted-foreground",
        className
      )}
    >
      {children}
    </span>
  )
}
