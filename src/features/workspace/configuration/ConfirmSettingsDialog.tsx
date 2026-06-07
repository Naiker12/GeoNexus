import * as React from "react"
import { Trash2Icon, XCircleIcon } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DialogActions } from "@/features/workspace/configuration/DialogActions"

export function ConfirmSettingsDialog({
  open,
  name,
  isDelete,
  isMcp,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  name: string
  isDelete: boolean
  isMcp: boolean
  onOpenChange: (open: boolean) => void
  onConfirm?: () => void
}) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (onConfirm) {
      onConfirm()
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(94vw,34rem)] rounded-lg p-0 bg-background border border-border">
        <DialogHeader className="mb-0 border-b border-border px-4 pb-3 pt-4">
          <div className="flex items-start gap-2.5 pr-8">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              {isDelete ? (
                <Trash2Icon className="size-4" />
              ) : (
                <XCircleIcon className="size-4" />
              )}
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold">
                {isDelete ? "Confirmar eliminación" : "Confirmar desactivación"}
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs leading-5">
                {isDelete
                  ? `Esto eliminará ${name} de la configuración local.`
                  : `Esto desactivará ${name} sin eliminar sus datos.`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-3 p-4">
          <div className="rounded-lg border border-border bg-muted/45 p-3 text-[11px] leading-relaxed text-muted-foreground">
            {isMcp
              ? "Rust deberá actualizar el registry MCP y detener nuevas llamadas a sus tools."
              : "Tauri deberá actualizar llm_configs y conservar la clave en keychain hasta borrado explícito."}
          </div>
          <DialogActions
            destructive={isDelete}
            submitLabel={isDelete ? "Confirmar" : "Desactivar"}
            onCancel={() => onOpenChange(false)}
          />
        </form>
      </DialogContent>
    </Dialog>
  )
}
