"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/Button"
import { Loader2Icon } from "lucide-react"

interface LoadingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LoadingModal({ open, onOpenChange }: LoadingModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cargando panel</DialogTitle>
          <DialogDescription>
            Estamos preparando la interfaz de Geo Agents. Por favor espera unos segundos.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-muted/50 bg-muted/10 p-6 text-sm text-muted-foreground">
          <Loader2Icon className="h-6 w-6 animate-spin" />
          <span>Sincronizando datos y cargando recursos...</span>
        </div>
        <div className="mt-6 flex justify-end">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
