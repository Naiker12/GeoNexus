import { useState, useMemo } from "react"
import { Loader2Icon, PlayIcon, SquareIcon, RefreshCwIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAutomations } from "./hooks/useAutomations"
import { AutomationCard } from "./components/AutomationCard"
import { CreateAutomationDialog } from "./components/CreateAutomationDialog"
import type { Automation } from "./types"

export function AutomationPage() {
  const {
    automations, loading, error, schedulerRunning,
    createAutomation, updateAutomation, toggleAutomation,
    deleteAutomation, runNow, startScheduler, stopScheduler, refresh,
  } = useAutomations()

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Automation | null>(null)
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    return automations.filter(a => {
      const matchSearch = !search ||
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.intent.toLowerCase().includes(search.toLowerCase())
      return matchSearch
    })
  }, [automations, search])

  const handleSubmit = async (form: any) => {
    if (editTarget) {
      await updateAutomation(form, editTarget.id)
    } else {
      await createAutomation(form)
    }
    setEditTarget(null)
  }

  const handleEdit = (automation: Automation) => {
    setEditTarget(automation)
    setCreateOpen(true)
  }

  const handleCloseDialog = () => {
    setCreateOpen(false)
    setEditTarget(null)
  }

  const activeCount = automations.filter(a => a.enabled).length
  const totalRunCount = automations.reduce((sum, a) => sum + a.run_count, 0)

  return (
    <section className="relative z-10 h-[calc(100svh-3.5rem)] overflow-auto px-3 py-3 sm:px-5 sm:py-4">
      <div className="mx-auto flex w-full max-w-[110rem] flex-col gap-3">

        {/* Header */}
        <header className="overflow-hidden rounded-lg border border-border/80 bg-card/95 shadow-sm backdrop-blur">
          <div className="h-0.5 bg-[linear-gradient(90deg,var(--primary),transparent)]" />
          <div className="p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-semibold tracking-tight sm:text-lg">Automatizaciones</h1>
                  {loading && <Loader2Icon className="size-4 animate-spin text-muted-foreground" />}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Crea tareas programadas describiéndolas en lenguaje natural.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={schedulerRunning ? stopScheduler : startScheduler}
                  className={cn(
                    "flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                    schedulerRunning
                      ? "border border-destructive/30 text-destructive hover:bg-destructive/10"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  {schedulerRunning ? (
                    <><SquareIcon className="size-3" /> Detener scheduler</>
                  ) : (
                    <><PlayIcon className="size-3" /> Iniciar scheduler</>
                  )}
                </button>
                <button
                  onClick={() => refresh()}
                  className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted/50"
                  title="Refrescar"
                >
                  <RefreshCwIcon className="size-3.5" />
                </button>
                <button
                  onClick={() => setCreateOpen(true)}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                  + Nueva automatización
                </button>
              </div>
            </div>
          </div>
        </header>

        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="flex gap-3 text-center">
          <StatBadge label="Total" value={automations.length} />
          <StatBadge label="Activos" value={activeCount} accent />
          <StatBadge label="Ejecuciones" value={totalRunCount} />
          <StatBadge
            label="Scheduler"
            value={schedulerRunning ? "Activo" : "Inactivo"}
            accent={schedulerRunning}
          />
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar automatización..."
            className="ml-auto h-8 w-56 rounded-lg border border-border bg-background px-2.5 text-xs outline-none focus:border-primary/50"
          />
        </div>

        {/* Grid o empty state */}
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            <Loader2Icon className="mr-2 size-5 animate-spin" />
            Cargando automatizaciones...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
            <span className="text-4xl mb-3">⏰</span>
            {automations.length === 0 ? (
              <>
                <p className="text-sm font-medium mb-1">Sin automatizaciones</p>
                <p className="text-xs text-muted-foreground mb-4 max-w-md">
                  Crea tu primera automatización describiendo en lenguaje natural
                  qué quieres que haga y cuándo.
                </p>
                <button
                  onClick={() => setCreateOpen(true)}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                >
                  Crear primera automatización
                </button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Ninguna automatización coincide con el filtro actual.
              </p>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filtered.map(automation => (
              <AutomationCard
                key={automation.id}
                automation={automation}
                onToggle={toggleAutomation}
                onEdit={handleEdit}
                onDelete={deleteAutomation}
                onRunNow={runNow}
              />
            ))}
          </div>
        )}
      </div>

      <CreateAutomationDialog
        open={createOpen}
        onClose={handleCloseDialog}
        onSubmit={handleSubmit}
        editAutomation={editTarget}
      />
    </section>
  )
}

function StatBadge({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="flex-1 rounded-lg border border-border/80 bg-card/50 px-3 py-2 text-center">
      <p className={cn("text-lg font-bold", accent ? "text-primary" : "text-foreground")}>
        {value}
      </p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
    </div>
  )
}
