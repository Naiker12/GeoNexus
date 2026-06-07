import { NativeSelect } from "@/components/ui/native-select"
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
          Selecciona un proveedor para ver sus detalles y modelos disponibles.
        </p>
      </div>
    )
  }

  const status = activeConnector?.status ?? "needs-key"

  return (
    <aside className="flex flex-col gap-6">
      {/* PROVEEDOR ACTIVO */}
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
            <dd className="text-right font-mono text-emerald-600 dark:text-emerald-400">
              {isTesting ? "obteniendo..." : (activeConnector?.model ?? activeOption.defaultModel)}
            </dd>

            <dt className="text-muted-foreground">endpoint</dt>
            <dd className="text-right font-mono text-muted-foreground">
              {activeConnector?.endpoint ?? activeOption.defaultEndpoint}
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
                {status === "online" && !isTesting ? " · 88ms" : ""}
                {isTesting && status === "online" && " · testeando..."}
              </span>
            </dd>

            <dt className="text-muted-foreground">tipo</dt>
            <dd className="text-right text-muted-foreground">
              {activeOption.type} ·{" "}
              {activeOption.auth === "api-key" ? "keychain" : "sin key"}
            </dd>
          </dl>
        </div>
      </section>

      {/* MODELOS DISPONIBLES */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Modelos disponibles
        </h2>
        <div className="flex flex-col gap-1.5">
          {isTesting ? (
            <>
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex h-[34px] animate-pulse items-center justify-between rounded-md border border-border bg-card/60 p-2"
                >
                  <div className="h-2 w-1/2 rounded bg-muted-foreground/20" />
                  <div className="h-2 w-8 rounded bg-muted-foreground/20" />
                </div>
              ))}
            </>
          ) : (
            activeOption.models.map((model, index) => {
              const isActive = index === 0 // Simulate first model as active
              return (
                <div
                  key={model}
                  className={cn(
                    "flex items-center justify-between rounded-md border p-2 text-xs transition-opacity duration-300",
                    isActive
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "border-border bg-card/60 text-muted-foreground"
                  )}
                >
                  <span className="font-mono">{model}</span>
                  <span className="text-[0.65rem]">
                    {isActive ? "8B · activo" : "7B"}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </section>

      {/* EMBEDDINGS */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Embeddings
        </h2>
        <div className="flex flex-col gap-3 rounded-lg border border-border/80 bg-card/95 p-3 shadow-sm backdrop-blur">
          <label className="grid gap-1.5 text-xs text-muted-foreground">
            Modelo activo para ChromaDB
            <NativeSelect className="w-full font-mono">
              <option>nomic-embed-text (online)</option>
              <option>all-minilm-l6-v2</option>
            </NativeSelect>
          </label>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-xs text-muted-foreground">
              Fallback fastembed (sin API)
            </span>
            <Switch defaultChecked />
          </div>
        </div>
      </section>
    </aside>
  )
}
