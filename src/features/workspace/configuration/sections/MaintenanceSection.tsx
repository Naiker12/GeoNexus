import { Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/Button"
import { maintenanceTasks } from "@/features/workspace/configuration/settings-data"

export function MaintenanceSection() {
  return (
    <div className="grid gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-primary">
            Mantenimiento
          </h3>
          <p className="mt-1 text-xs leading-4 text-muted-foreground">
            Tareas de mantenimiento, limpieza y diagnóstico del sistema.
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-7 shrink-0">
          <Trash2Icon className="size-3.5" />
          Limpiar cache
        </Button>
      </div>

      <div className="grid gap-2">
        {maintenanceTasks.map((task) => (
          <article
            key={task.title}
            className="rounded-lg border border-border bg-card/70 p-3"
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              <task.icon className="size-3.5 text-primary" />
              <span className="truncate">{task.title}</span>
            </div>
            <code className="mt-1 block truncate font-mono text-[0.68rem] text-muted-foreground">
              {task.command}
            </code>
          </article>
        ))}
      </div>
    </div>
  )
}
