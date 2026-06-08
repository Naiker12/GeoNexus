import { Switch } from "@/components/ui/switch"
import { ProviderBrandIcon } from "@/features/workspace/ai-containers/ProviderBrandIcon"
import type { ProviderOption } from "@/features/workspace/ai-containers/provider-options"
import type { AiConnector } from "@/features/workspace/workspace-data"
import { cn } from "@/lib/utils"

type ActiveProviderPanelProps = {
  activeOption: ProviderOption | null
  activeConnector?: AiConnector
  isTesting?: boolean
}

export function ActiveProviderPanel({
  activeOption,
  activeConnector,
  isTesting,
}: ActiveProviderPanelProps) {
  if (!activeOption) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
        <p className="text-sm">
          Sin proveedor activo. Configura un proveedor para ver sus detalles.
        </p>
      </div>
    )
  }

  const status = activeConnector?.status ?? "needs-key"
  const model = activeConnector?.model || "Sin modelo"
  const endpoint = activeConnector?.endpoint || "Sin endpoint"

  return (
    <aside className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Proveedor activo
        </h2>
        <div className="rounded-lg border border-border/80 bg-card/95 p-3 shadow-sm backdrop-blur">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded bg-muted text-primary">
              <ProviderBrandIcon
                providerId={activeOption.id}
                fallback={activeOption.icon}
                className="size-3.5"
              />
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-primary">
              {activeOption.name}
            </h3>
          </div>

          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
            <dt className="text-muted-foreground">modelo</dt>
            <dd className="text-right font-mono text-muted-foreground">
              {isTesting ? "obteniendo..." : model}
            </dd>

            <dt className="text-muted-foreground">endpoint</dt>
            <dd className="text-right font-mono text-muted-foreground">
              {endpoint}
            </dd>

            <dt className="text-muted-foreground">estado</dt>
            <dd className="text-right font-medium">
              <span
                className={cn(
                  status === "online" && "text-emerald-600 dark:text-emerald-400",
                  status === "offline" && "text-muted-foreground",
                  status === "needs-key" &&
                    "text-orange-600 dark:text-orange-400"
                )}
              >
                {status === "needs-key" ? "requiere key" : status}
              </span>
            </dd>

            <dt className="text-muted-foreground">tipo</dt>
            <dd className="text-right text-muted-foreground">
              {activeOption.type} -{" "}
              {activeOption.auth === "api-key" ? "keychain" : "sin key"}
            </dd>
          </dl>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Modelos disponibles
        </h2>
        <div className="rounded-lg border border-border/80 bg-card/95 p-3 text-sm text-muted-foreground shadow-sm backdrop-blur">
          Sin modelos detectados
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Embeddings
        </h2>
        <div className="flex flex-col gap-3 rounded-lg border border-border/80 bg-card/95 p-3 shadow-sm backdrop-blur">
          <div className="text-sm text-muted-foreground">
            Sin modelo de embeddings configurado
          </div>
          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-xs text-muted-foreground">
              Fallback local
            </span>
            <Switch disabled />
          </div>
        </div>
      </section>
    </aside>
  )
}
