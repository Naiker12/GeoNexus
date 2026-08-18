import * as React from "react"
import { AlertTriangleIcon, CheckIcon, HardDriveIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/Button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { LocalModelItem } from "../types"

interface FreeUpSpaceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  models: LocalModelItem[]
  onDeleteSelected: (filenames: string[]) => void
}

export function FreeUpSpaceDialog({
  open,
  onOpenChange,
  models,
  onDeleteSelected,
}: FreeUpSpaceDialogProps) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set())

  const toggleSelect = (filename: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(filename)) next.delete(filename)
      else next.add(filename)
      return next
    })
  }

  const selectAll = () => {
    if (selected.size === models.length) setSelected(new Set())
    else setSelected(new Set(models.map((m) => m.filename)))
  }

  const selectedSizeGb = React.useMemo(() => {
    return models
      .filter((m) => selected.has(m.filename))
      .reduce((acc, m) => acc + m.size_gb, 0)
      .toFixed(2)
  }, [models, selected])

  const handleDelete = () => {
    onDeleteSelected(Array.from(selected))
    setSelected(new Set())
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-5">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <Trash2Icon className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold">Liberar Espacio en Disco</DialogTitle>
              <DialogDescription className="text-xs">
                Selecciona los modelos que deseas eliminar del almacenamiento local.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-2 space-y-2">
          <div className="flex items-center justify-between px-1 text-xs">
            <button
              type="button"
              onClick={selectAll}
              className="text-primary font-medium hover:underline text-[11px]"
            >
              {selected.size === models.length ? "Deseleccionar todos" : "Seleccionar todos"}
            </button>
            <span className="text-muted-foreground text-[11px]">
              Liberarás: <strong className="text-foreground">{selectedSizeGb} GB</strong>
            </span>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1.5 rounded-2xl border border-border/70 p-2 [scrollbar-width:thin]">
            {models.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">No hay modelos para eliminar.</p>
            ) : (
              models.map((m) => {
                const isChecked = selected.has(m.filename)
                return (
                  <div
                    key={m.filename}
                    onClick={() => toggleSelect(m.filename)}
                    className="flex items-center justify-between rounded-xl px-2.5 py-2 text-xs hover:bg-muted/40 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`flex size-4 items-center justify-center rounded border transition-colors ${
                          isChecked ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/50"
                        }`}
                      >
                        {isChecked && <CheckIcon className="size-3 stroke-[3]" />}
                      </div>
                      <span className="truncate font-medium text-foreground">{m.name}</span>
                    </div>
                    <span className="shrink-0 text-muted-foreground font-mono text-[11px]">{m.size_gb} GB</span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="rounded-xl text-xs">
            Cancelar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={selected.size === 0}
            onClick={handleDelete}
            className="rounded-xl text-xs gap-1.5"
          >
            <Trash2Icon className="size-3.5" />
            <span>Eliminar ({selected.size})</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
