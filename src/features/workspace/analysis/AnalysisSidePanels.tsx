import { useState } from "react"
import { BrainCircuitIcon, GaugeIcon, BarChart3Icon, CopyIcon, InfoIcon, MessageSquareTextIcon } from "lucide-react"
import { toast } from "sonner"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/Button"
import { useModelUsage, useSkillUsage, useTokenTimeline, useTopQueries } from "@/features/workspace/analysis/useAnalysis"
import type { ModelUsage } from "@/types/analysis"
import { cn } from "@/lib/utils"

const MODEL_COLORS = [
  "bg-primary",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-orange-500",
  "bg-sky-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-teal-500",
]

const TOOL_LABELS: Record<string, string> = {
  read_file: "Leer archivo",
  search_code: "Buscar en código",
  list_directory: "Listar directorio",
  glob_files: "Buscar archivos",
}

function toolLabel(name: string): string {
  return TOOL_LABELS[name] ?? name.replace(/_/g, " ")
}

function ModelDetailDialog({
  model,
  open,
  onOpenChange,
}: {
  model: ModelUsage | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  if (!model) return null
  const avgTokens = model.requests > 0 ? Math.round(model.tokens / model.requests) : 0
  const total = model.input_tokens + model.output_tokens
  const inputPct = total > 0 ? (model.input_tokens / total) * 100 : 50
  const outputPct = total > 0 ? (model.output_tokens / total) * 100 : 50

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{model.model}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 text-sm">
          <div className="grid grid-cols-[7rem_1fr] gap-2">
            <span className="text-muted-foreground">Proveedor</span>
            <span className="font-medium">{model.provider}</span>

            <span className="text-muted-foreground">Tokens totales</span>
            <span className="font-medium">{model.tokens.toLocaleString()}</span>

            <span className="text-muted-foreground">Input</span>
            <span className="font-medium">{model.input_tokens.toLocaleString()}</span>

            <span className="text-muted-foreground">Output</span>
            <span className="font-medium">{model.output_tokens.toLocaleString()}</span>

            <span className="text-muted-foreground">Solicitudes</span>
            <span className="font-medium">{model.requests}</span>

            <span className="text-muted-foreground">Promedio tokens</span>
            <span className="font-medium">{avgTokens.toLocaleString()} / solicitud</span>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Ratio Input / Output</p>
            <div className="flex h-5 w-full gap-px rounded-sm overflow-hidden">
              <div
                className="h-full bg-primary/40 transition-all flex items-center justify-center text-[0.55rem] font-medium text-white"
                style={{ width: `${inputPct}%` }}
              >
                {inputPct > 15 ? `${Math.round(inputPct)}%` : ""}
              </div>
              <div
                className="h-full bg-primary transition-all flex items-center justify-center text-[0.55rem] font-medium text-white"
                style={{ width: `${outputPct}%` }}
              >
                {outputPct > 15 ? `${Math.round(outputPct)}%` : ""}
              </div>
            </div>
            <div className="mt-1 flex justify-between text-[0.62rem] text-muted-foreground">
              <span>Input: {model.input_tokens.toLocaleString()}</span>
              <span>Output: {model.output_tokens.toLocaleString()}</span>
            </div>
          </div>

          <div className="mt-2 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(model.model)
                toast.success("Nombre del modelo copiado")
              }}
            >
              <CopyIcon className="size-3.5" />
              Copiar modelo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function AnalysisSidePanels() {
  return (
    <aside className="grid content-start gap-3">
      <ModelUsagePanel />
      <SkillPanel />
      <TopQueriesPanel />
      <TokensBarChart />
    </aside>
  )
}

function ModelUsagePanel() {
  const { data, loading } = useModelUsage()
  const items = data ?? []
  const totalTokens = items.reduce((sum, m) => sum + m.tokens, 0)
  const [detail, setDetail] = useState<ModelUsage | null>(null)

  return (
    <>
      <section className="rounded-lg border border-border/80 bg-card/95 p-3 shadow-sm backdrop-blur">
        <div className="mb-3 flex items-center gap-2">
          <GaugeIcon className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Uso por modelo</h2>
        </div>
        <div className="grid gap-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse space-y-1.5">
                <div className="h-4 w-32 rounded bg-muted" />
                <div className="h-2 rounded-full bg-muted" />
              </div>
            ))
          ) : items.length > 0 ? (
            items.map((item, i) => {
              const percent = totalTokens ? Math.round((item.tokens / totalTokens) * 100) : 0
              const color = MODEL_COLORS[i % MODEL_COLORS.length]
              const avgTokens = item.requests > 0 ? Math.round(item.tokens / item.requests) : 0

              return (
                <TooltipProvider key={item.model}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setDetail(item)}
                        className="grid w-full gap-1.5 text-left hover:bg-accent/50 rounded-md p-1.5 -mx-1.5 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{item.model}</p>
                            <p className="text-xs text-muted-foreground">{item.provider}</p>
                          </div>
                          <span className="text-xs font-medium">{percent}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted">
                          <div
                            className={cn("h-full rounded-full transition-all", color)}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {item.tokens.toLocaleString()} tokens / {item.requests} solicitudes
                        </p>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-56">
                      <div className="grid gap-1 text-xs">
                        <p><span className="text-muted-foreground">Input:</span> {item.input_tokens.toLocaleString()}</p>
                        <p><span className="text-muted-foreground">Output:</span> {item.output_tokens.toLocaleString()}</p>
                        <p><span className="text-muted-foreground">Promedio:</span> {avgTokens.toLocaleString()} / solicitud</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )
            })
          ) : (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Sin uso registrado
            </div>
          )}
        </div>
      </section>

      <ModelDetailDialog model={detail} open={detail !== null} onOpenChange={(v) => { if (!v) setDetail(null) }} />
    </>
  )
}

function SkillPanel() {
  const { data, loading } = useSkillUsage()
  const items = data ?? []

  return (
    <section className="rounded-lg border border-border/80 bg-card/95 p-3 shadow-sm backdrop-blur">
      <div className="mb-3 flex items-center gap-2">
        <BrainCircuitIcon className="size-4 text-primary" />
        <h2 className="text-sm font-semibold">Skills usadas</h2>
      </div>
      <div className="grid gap-2">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-md border border-border bg-background/75 p-2">
              <div className="h-4 w-24 rounded bg-muted" />
            </div>
          ))
        ) : items.length > 0 ? (
          items.map((item) => {
            const rateColor =
              item.success_rate >= 90
                ? "text-emerald-600"
                : item.success_rate >= 70
                  ? "text-yellow-600"
                  : "text-red-500"

            return (
              <TooltipProvider key={item.tool_name}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <article className="grid cursor-default grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-md border border-border bg-background/75 p-2 transition-colors hover:bg-accent/50">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{toolLabel(item.tool_name)}</p>
                        <p className="text-xs text-muted-foreground">{item.calls} llamadas</p>
                      </div>
                      <span className={cn("rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium", rateColor)}>
                        {item.success_rate}%
                      </span>
                    </article>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-48">
                    <p><span className="text-muted-foreground">Tool:</span> {item.tool_name}</p>
                    <p><span className="text-muted-foreground">Tasa de éxito:</span> {item.success_rate}%</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )
          })
        ) : (
          <div className="flex items-start gap-2 py-4 text-xs text-muted-foreground">
            <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
            <p>
              Las tool_calls aparecen aquí automáticamente cuando una conversación usa herramientas.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

function TopQueriesPanel() {
  const { data, loading } = useTopQueries()
  const items = data ?? []
  const maxTokens = items.length > 0 ? items[0].tokens : 0

  return (
    <section className="rounded-lg border border-border/80 bg-card/95 p-3 shadow-sm backdrop-blur">
      <div className="mb-3 flex items-center gap-2">
        <MessageSquareTextIcon className="size-4 text-primary" />
        <h2 className="text-sm font-semibold">Consultas top</h2>
      </div>
      <div className="grid gap-2">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse space-y-1">
              <div className="h-4 w-40 rounded bg-muted" />
              <div className="h-2 w-full rounded bg-muted" />
            </div>
          ))
        ) : items.length > 0 ? (
          items.map((q) => {
            const pct = maxTokens ? (q.tokens / maxTokens) * 100 : 0
            return (
              <div key={q.title} className="grid gap-0.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium" title={q.title}>
                    {q.title.length > 32 ? `${q.title.slice(0, 32)}...` : q.title}
                  </p>
                  <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[0.62rem] font-medium text-primary">
                    {q.runs}x
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/40 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-[0.62rem] text-muted-foreground">
                    {q.tokens.toLocaleString()}
                  </span>
                </div>
              </div>
            )
          })
        ) : (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Sin consultas registradas
          </div>
        )}
      </div>
    </section>
  )
}

function TokensBarChart() {
  const { data, loading } = useTokenTimeline("project-default", "7d")
  const items = data ?? []

  const maxTokens = items.length > 0 ? Math.max(...items.map((d) => d.total_tokens)) : 0

  return (
    <section className="rounded-lg border border-border/80 bg-card/95 p-3 shadow-sm backdrop-blur">
      <div className="mb-3 flex items-center gap-2">
        <BarChart3Icon className="size-4 text-primary" />
        <h2 className="text-sm font-semibold">Tokens por día (7d)</h2>
      </div>
      <div className="grid gap-2">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse space-y-1">
              <div className="h-3 w-16 rounded bg-muted" />
              <div className="h-4 w-full rounded bg-muted" />
            </div>
          ))
        ) : items.length > 0 ? (
          items.map((item) => {
            const pct = maxTokens ? (item.total_tokens / maxTokens) * 100 : 0
            return (
              <TooltipProvider key={item.hora}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="grid cursor-default gap-0.5">
                      <div className="flex items-center justify-between text-[0.68rem]">
                        <span className="text-muted-foreground">{item.hora}</span>
                        <span className="font-medium text-foreground">
                          {item.total_tokens.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex h-4 w-full gap-px rounded-sm overflow-hidden bg-muted">
                        <div
                          className="h-full bg-primary/40 transition-all"
                          style={{ width: `${(item.input_tokens / maxTokens) * 100}%` }}
                        />
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${(item.output_tokens / maxTokens) * 100}%` }}
                        />
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-48">
                    <p className="font-medium">{item.hora}</p>
                    <p><span className="text-muted-foreground">Input:</span> {item.input_tokens.toLocaleString()}</p>
                    <p><span className="text-muted-foreground">Output:</span> {item.output_tokens.toLocaleString()}</p>
                    <p><span className="text-muted-foreground">Total:</span> {item.total_tokens.toLocaleString()}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )
          })
        ) : (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Sin datos de tokens
          </div>
        )}
      </div>
    </section>
  )
}
