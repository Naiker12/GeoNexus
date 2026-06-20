import * as React from "react"
import { CheckIcon, ChevronDownIcon, SearchIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/Button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Switch } from "@/components/ui/switch"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ProviderBrandIcon } from "@/features/workspace/ai-containers/ProviderBrandIcon"
import type { ProviderOption } from "@/features/workspace/ai-containers/provider-options"
import type { AiConnector } from "@/types/workspace-types"
import { cn } from "@/lib/utils"

type ActiveProviderPanelProps = {
  activeOption: ProviderOption | null
  activeConnector?: AiConnector
  isTesting?: boolean
  onModelChange?: (model: string) => void
  onModelDelete?: (model: string) => void
}

export function ActiveProviderPanel({
  activeOption,
  activeConnector,
  isTesting,
  onModelChange,
  onModelDelete,
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
  const allModels = activeConnector?.models ?? []

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
        {allModels.length > 0 ? (
          <div className="rounded-lg border border-border/80 bg-card/95 p-3 shadow-sm backdrop-blur">
            <ModelCard
              models={allModels}
              selected={model}
              onSelect={onModelChange}
              onDelete={onModelDelete}
            />
          </div>
        ) : (
          <div className="rounded-lg border border-border/80 bg-card/95 p-3 text-sm text-muted-foreground shadow-sm backdrop-blur">
            Sin modelos detectados
          </div>
        )}
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

function ModelCard({
  models,
  selected,
  onSelect,
  onDelete,
}: {
  models: string[]
  selected: string
  onSelect?: (model: string) => void
  onDelete?: (model: string) => void
}) {
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null)
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")

  const filtered = React.useMemo(
    () =>
      query
        ? models.filter((m) => m.toLowerCase().includes(query.toLowerCase()))
        : models,
    [models, query]
  )

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {models.length} modelo{models.length !== 1 ? "s" : ""}
        </span>
        {selected !== "Sin modelo" && (
          <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            {selected}
          </span>
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-between text-xs"
          >
            {selected !== "Sin modelo" ? (
              <span className="truncate">{selected}</span>
            ) : (
              <span className="text-muted-foreground">
                Seleccionar modelo...
              </span>
            )}
            <ChevronDownIcon className="size-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-(--radix-popover-trigger-width) overflow-hidden rounded-lg p-0"
          align="start"
        >
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filtrar modelos..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-1 py-8 text-center text-sm text-muted-foreground">
                <SearchIcon className="size-5 opacity-30" />
                <span>No se encontraron modelos</span>
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                <div className="px-2 py-1 text-xs text-muted-foreground">
                  {filtered.length} de {models.length} modelos
                </div>
                {filtered.map((m) => (
                  <div
                    key={m}
                    className="group/model flex items-center gap-1"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSelect?.(m)
                        setOpen(false)
                      }}
                      className={cn(
                        "flex min-w-0 flex-1 items-center gap-2 rounded-md px-2.5 py-2 text-sm text-left transition-colors hover:bg-accent hover:text-accent-foreground",
                        selected === m && "bg-accent/60 font-medium"
                      )}
                    >
                      <CheckIcon
                        className={cn(
                          "size-4 shrink-0 transition-opacity",
                          selected === m ? "opacity-100 text-primary" : "opacity-0"
                        )}
                      />
                      <span className="truncate">{m}</span>
                    </button>
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(m)}
                        className="mr-1 flex size-6 shrink-0 items-center justify-center rounded opacity-0 group-hover/model:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        aria-label={`Eliminar ${m}`}
                      >
                        <Trash2Icon className="size-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title="Eliminar modelo"
        description={
          <>
            ¿Eliminar <strong>{deleteTarget}</strong>? El modelo dejará de estar
            disponible en el chat y los conectores.
          </>
        }
        onConfirm={() => {
          if (deleteTarget) onDelete?.(deleteTarget)
        }}
      />
    </div>
  )
}
