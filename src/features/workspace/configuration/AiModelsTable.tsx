import {
  BrainCircuitIcon,
  EyeIcon,
  PencilIcon,
  Trash2Icon,
  XCircleIcon,
} from "lucide-react"

import { Button } from "@/components/ui/Button"
import type { SettingsDialog } from "@/features/workspace/configuration/settings-types"

const configuredModels = [
  {
    provider: "Ollama",
    model: "llama3.1",
    endpoint: "localhost:11434",
    key: "Sin clave",
    status: "Activo",
  },
  {
    provider: "LM Studio",
    model: "OpenAI compatible",
    endpoint: "localhost:1234/v1",
    key: "Sin clave",
    status: "Inactivo",
  },
  {
    provider: "OpenRouter",
    model: "claude / gpt / gemini",
    endpoint: "openrouter.ai/api/v1",
    key: "keychain: openrouter",
    status: "Revisar",
  },
]

export type ConfiguredModel = {
  provider: string
  model: string
  endpoint: string
  key: string
  status: string
}

export function AiModelsTable({
  models,
  onDialogChange,
}: {
  models: ConfiguredModel[]
  onDialogChange: (dialog: SettingsDialog) => void
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
        <Button
          size="sm"
          className="h-7"
          onClick={() => onDialogChange({ type: "add-model" })}
        >
          <BrainCircuitIcon className="size-4" />
          Agregar modelo
        </Button>
      </div>
      <div className="divide-y divide-border">
        {models.map((item) => (
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
              onView={() =>
                onDialogChange({ type: "view-key", name: item.provider })
              }
              onEdit={() =>
                onDialogChange({ type: "edit-model", name: item.provider })
              }
              onDisable={() =>
                onDialogChange({ type: "disable-model", name: item.provider })
              }
              onDelete={() =>
                onDialogChange({ type: "delete-model", name: item.provider })
              }
            />
          </article>
        ))}
      </div>
    </div>
  )
}

function RowActions({
  onView,
  onEdit,
  onDisable,
  onDelete,
}: {
  onView: () => void
  onEdit: () => void
  onDisable: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon-xs" aria-label="Ver clave" onClick={onView}>
        <EyeIcon className="size-3.5" />
      </Button>
      <Button variant="ghost" size="icon-xs" aria-label="Editar" onClick={onEdit}>
        <PencilIcon className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="Desactivar"
        onClick={onDisable}
      >
        <XCircleIcon className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="Eliminar"
        onClick={onDelete}
      >
        <Trash2Icon className="size-3.5" />
      </Button>
    </div>
  )
}
