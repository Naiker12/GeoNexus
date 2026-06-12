import * as React from "react"
import { CpuIcon, InfoIcon, Loader2Icon } from "lucide-react"
import { useSkillUsage } from "@/features/workspace/analysis/useAnalysis"

function toolLabel(name: string): string {
  const LABELS: Record<string, string> = {
    read_file: "Leer archivo",
    search_code: "Buscar en código",
    list_directory: "Listar directorio",
    glob_files: "Buscar archivos",
    search_web: "Búsqueda web",
    container_list: "Listar contenedor",
    container_get: "Obtener archivo",
    container_search: "Buscar en contenedor",
    container_sync: "Sincronizar contenedor",
    container_upload: "Subir archivo",
  }
  return LABELS[name] ?? name.replace(/_/g, " ")
}

export function SkillsPage() {
  const { data, loading } = useSkillUsage()

  const totalCalls = data?.reduce((s, sk) => s + sk.calls, 0) ?? 0
  const avgSuccess =
    data && data.length > 0
      ? Math.round(data.reduce((s, sk) => s + sk.success_rate, 0) / data.length)
      : 0

  return (
    <section className="relative z-10 h-[calc(100svh-3.5rem)] overflow-auto px-3 py-3 sm:px-5 sm:py-4">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-4">
          <h1 className="text-lg font-semibold tracking-tight">Skills</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Herramientas y habilidades disponibles para los agentes del sistema.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2Icon className="mr-2 size-5 animate-spin" />
            Cargando skills...
          </div>
        ) : !data || data.length === 0 ? (
          <div className="flex items-start gap-3 rounded-lg border p-4 text-sm text-muted-foreground">
            <InfoIcon className="mt-0.5 size-4 shrink-0" />
            <p>
              Las tool_calls aparecen aquí automáticamente cuando una conversación usa herramientas.
              Chatea con la IA para comenzar a registrar skills.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="flex gap-4">
              <div className="flex-1 rounded-lg border bg-card p-3 shadow-sm">
                <p className="text-xs text-muted-foreground">Total llamadas</p>
                <p className="text-2xl font-semibold">{totalCalls.toLocaleString()}</p>
              </div>
              <div className="flex-1 rounded-lg border bg-card p-3 shadow-sm">
                <p className="text-xs text-muted-foreground">Skills distintas</p>
                <p className="text-2xl font-semibold">{data.length}</p>
              </div>
              <div className="flex-1 rounded-lg border bg-card p-3 shadow-sm">
                <p className="text-xs text-muted-foreground">Tasa éxito promedio</p>
                <p className="text-2xl font-semibold">{avgSuccess}%</p>
              </div>
            </div>

            <div className="grid gap-2">
              {data.map((skill) => {
                const rateColor =
                  skill.success_rate >= 90
                    ? "text-emerald-600"
                    : skill.success_rate >= 70
                      ? "text-yellow-600"
                      : "text-red-500"
                return (
                  <div
                    key={skill.tool_name}
                    className="flex items-center gap-4 rounded-lg border bg-card p-3 shadow-sm"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                      <CpuIcon className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{toolLabel(skill.tool_name)}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {skill.calls} llamadas
                      </p>
                    </div>
                    <span
                      className={`rounded-md bg-primary/10 px-2 py-1 text-sm font-medium ${rateColor}`}
                    >
                      {skill.success_rate}%
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
