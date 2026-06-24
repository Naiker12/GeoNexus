import * as React from "react"
import { CheckCircle2Icon } from "lucide-react"

import { Button } from "@/components/ui/Button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type FolderPermissionDialogProps = {
  open: boolean
  folderPath: string
  folderName: string
  onConfirm: () => void
  onCancel: () => void
}

function FolderPermissionDialog({
  open,
  folderPath,
  folderName,
  onConfirm,
  onCancel,
}: FolderPermissionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel() }}>
      <DialogContent className="w-[min(88vw,28rem)] rounded-lg p-0">
        <DialogHeader className="px-4 pb-3 pt-4 border-b border-border">
          <DialogTitle className="text-sm">Permisos de carpeta</DialogTitle>
          <DialogDescription className="mt-1 text-xs">
            Geo Agents necesita los siguientes permisos sobre:
            <code className="mt-1 block rounded bg-muted px-2 py-1 text-xs font-mono">{folderPath}</code>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 p-4">
          <ul className="grid gap-2 text-xs">
            {[
              ["Lectura", "Leer archivos PDF, DOCX, GeoJSON, SHP y mas formatos"],
              ["Indexacion", "Extraer texto, crear chunks y generar embeddings"],
              ["Cache local", "Copiar archivos al cache interno de Geo Agents"],
              ["Grafo", "Vincular entidades y relaciones en el grafo de conocimiento"],
            ].map(([title, desc]) => (
              <li key={title} className="flex items-start gap-2 rounded-md border border-border bg-background/60 px-2.5 py-2">
                <CheckCircle2Icon className="size-3.5 shrink-0 mt-0.5 text-primary" />
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="text-muted-foreground">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            No se modificaran tus archivos originales. Los chunks y embeddings se almacenan en la base de datos local.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
            <Button size="sm" onClick={onConfirm}>Conceder permisos</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { FolderPermissionDialog }
export type { FolderPermissionDialogProps }
