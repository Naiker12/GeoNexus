import {
  CheckCircle2Icon,
  FolderCogIcon,
  FolderOpenIcon,
  TerminalIcon,
} from "lucide-react"

import { Button } from "@/components/ui/Button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/Input"
import { DialogActions } from "@/features/workspace/settings/DialogActions"
import { CheckRow, Field } from "@/features/workspace/settings/settings-ui"

export function LocalPathDialog({
  open,
  name,
  value,
  detail,
  onOpenChange,
}: {
  open: boolean
  name: string
  value: string
  detail: string
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <LocalPathDialogContent
        name={name}
        value={value}
        detail={detail}
        onCancel={() => onOpenChange(false)}
      />
    </Dialog>
  )
}

export function LocalPathDialogContent({
  name,
  value,
  detail,
  onCancel,
}: {
  name: string
  value: string
  detail: string
  onCancel?: () => void
}) {
  return (
    <DialogContent className="w-[min(94vw,38rem)] rounded-lg p-0">
      <DialogHeader className="mb-0 border-b border-border px-4 pb-3 pt-4">
        <div className="flex items-start gap-2.5 pr-8">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FolderCogIcon className="size-4" />
          </div>
          <div className="min-w-0">
            <DialogTitle className="text-base">
              Cambiar ruta: {name}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm leading-5">
              {detail}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <form className="grid gap-3 p-4">
        <Field label="Ruta actual">
          <div className="flex gap-2">
            <Input defaultValue={value} className="font-mono text-xs" />
            <Button variant="outline" size="icon" type="button" aria-label="Elegir carpeta">
              <FolderOpenIcon className="size-4" />
            </Button>
          </div>
        </Field>

        <div className="grid gap-2 rounded-lg border border-border bg-muted/35 p-3">
          <div>
            <p className="text-sm font-medium">Configuracion de ruta local</p>
            <p className="mt-1 text-xs leading-4 text-muted-foreground">
              Tauri debera verificar permisos, existencia de carpeta y
              migracion de datos antes de persistir la nueva ruta.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" type="button">
              <CheckCircle2Icon className="size-4" />
              Validar ruta
            </Button>
            <Button variant="outline" size="sm" type="button">
              <FolderOpenIcon className="size-4" />
              Abrir carpeta
            </Button>
            <Button variant="outline" size="sm" type="button">
              <TerminalIcon className="size-4" />
              Ver comando
            </Button>
          </div>
          <code className="rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs text-muted-foreground">
            tauri::dialog::FileDialogBuilder::new().pick_folder()
          </code>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <CheckRow label="Crear carpeta si no existe" checked />
          <CheckRow label="Migrar datos existentes" checked={name !== "Workspace"} />
          <CheckRow label="Mantener copia anterior" checked />
          <CheckRow label="Validar escritura" checked />
        </div>

        <DialogActions submitLabel="Guardar ruta" onCancel={onCancel ?? (() => undefined)} />
      </form>
    </DialogContent>
  )
}
