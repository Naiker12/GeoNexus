import {
  BrainCircuitIcon,
  EyeIcon,
  PencilIcon,
  Trash2Icon,
  XCircleIcon,
} from "lucide-react"

import { Button } from "@/components/ui/Button"

export type ConfiguredModel = {
  provider: string
  model: string
  endpoint: string
  key: string
  status: string
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
    <div className="overflow-hidden rounded-md border border-border bg-card/70">
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
        <div>
          <h4 className="text-sm font-semibold">Modelos IA configurados</h4>
          <p className="text-xs text-muted-foreground">
            Aquí se podrá ver, editar, desactivar o eliminar cada proveedor.
          </p>
        </div>
        <Button size="sm" className="h-7" onClick={onAddClick}>
          <BrainCircuitIcon className="size-4" />
          Agregar modelo
        </Button>
      </div>
      <div className="divide-y divide-border">
        {models.length ? (
          models.map((item) => (
            <article
              key={`${item.provider}-${item.model}`}
              className="grid gap-2 px-3 py-2 md:grid-cols-[9rem_minmax(0,1fr)_minmax(0,1fr)_8rem_auto] md:items-center"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.provider}</p>
                <p className="text-xs text-muted-foreground">{item.status}</p>
              </div>
              <p className="truncate text-sm text-muted-foreground">
                {item.model}
              </p>
              <code className="truncate font-mono text-xs text-muted-foreground">
                {item.endpoint}
              </code>
              <span className="truncate text-xs text-muted-foreground">
                {item.key}
              </span>
              <RowActions
                onDisable={() => onToggleStatus(item.provider)}
                onDelete={() => onDelete(item.provider)}
              />
            </article>
          ))
        ) : (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            Sin modelos configurados
          </div>
        )}
      </div>
    </div>
  )
}

function RowActions({
  onDisable,
  onDelete,
}: {
  onDisable: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon-xs" aria-label="Desactivar" onClick={onDisable}>
        <XCircleIcon className="size-3.5" />
      </Button>
      <Button variant="ghost" size="icon-xs" aria-label="Eliminar" onClick={onDelete}>
        <Trash2Icon className="size-3.5" />
      </Button>
    </div>
  )
}
