import { BotIcon, CpuIcon, PlusIcon, Settings2Icon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/Button"
import { ProviderBrandIcon } from "@/features/workspace/ai-containers/ProviderBrandIcon"
import { cn } from "@/lib/utils"

export type ConfiguredModel = {
  provider: string
  model: string
  endpoint: string
  key: string
  status: string
  id?: string
}

export function AiModelsTable({
  models,
  onAddClick,
  onDelete,
  onToggleStatus,
}: {
  models: ConfiguredModel[]
  onAddClick: () => void
  onDelete: (name: string) => void
  onToggleStatus: (name: string) => void
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-border/70 bg-card/85 shadow-2xs">
      {/* ─── Encabezado de la Sección ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 p-4">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground font-mono">
            Proveedores y Modelos Conectados
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Administra endpoints, modelos en memoria y claves de autenticación local.
          </p>
        </div>

        <Button
          size="sm"
          onClick={onAddClick}
          className="rounded-xl text-xs font-semibold gap-1.5 self-start sm:self-auto"
        >
          <PlusIcon className="size-3.5" />
          <span>Conectar Proveedor</span>
        </Button>
      </div>

      {/* ─── Lista o Estado Vacío ─── */}
      {models.length > 0 ? (
        <div className="divide-y divide-border/50">
          {models.map((item) => {
            const isOnline = item.status === "Activo" || item.status === "online"
            const providerId = item.id || item.provider.toLowerCase().replace(/\s+/g, "-")

            return (
              <article
                key={`${item.provider}-${item.model}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-muted/80 text-foreground border border-border/60">
                    <ProviderBrandIcon
                      providerId={providerId}
                      fallback={BotIcon}
                      className="size-4.5"
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-foreground truncate">
                        {item.provider}
                      </span>
                      <button
                        type="button"
                        onClick={() => onToggleStatus(item.provider)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.2 text-[9px] font-mono font-semibold uppercase tracking-wider transition-all",
                          isOnline
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-muted text-muted-foreground border border-border/60"
                        )}
                      >
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            isOnline ? "bg-emerald-500" : "bg-muted-foreground/50"
                          )}
                        />
                        {isOnline ? "Online" : "Offline"}
                      </button>
                    </div>

                    <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                      <span className="font-mono rounded-md bg-muted/60 px-1.5 py-0.2 text-foreground/80 font-medium">
                        {item.model || "Sin modelo"}
                      </span>
                      <span className="text-muted-foreground/60">•</span>
                      <span className="font-mono text-[10px] text-muted-foreground/80 truncate max-w-[220px]">
                        {item.endpoint}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Acciones de la Fila */}
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={onAddClick}
                    className="rounded-lg text-[11px] h-7 gap-1"
                  >
                    <Settings2Icon className="size-3" />
                    <span>Config</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => onDelete(item.provider)}
                    className="rounded-lg text-[11px] h-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title="Eliminar proveedor"
                  >
                    <Trash2Icon className="size-3.5" />
                  </Button>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        /* ─── Estado Vacío Moderno y Atractivo ─── */
        <div className="flex flex-col items-center justify-center p-8 sm:p-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-3xl bg-muted/60 text-muted-foreground border border-border/70 mb-3 shadow-2xs">
            <CpuIcon className="size-6 opacity-70" />
          </div>
          <h5 className="text-xs font-bold text-foreground tracking-tight">
            No hay proveedores de IA configurados
          </h5>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
            Conecta servidores locales (Ollama, LM Studio, vLLM) o APIs comerciales (OpenAI, Claude,
            Gemini, DeepSeek) para comenzar a chatear.
          </p>

          <Button
            size="sm"
            onClick={onAddClick}
            className="mt-4 rounded-xl text-xs font-semibold gap-1.5 px-4 shadow-xs"
          >
            <PlusIcon className="size-3.5" />
            <span>Conectar primer proveedor</span>
          </Button>
        </div>
      )}
    </div>
  )
}
