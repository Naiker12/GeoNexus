import { Loader2Icon } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/Button"
import { useToast } from "@/components/ui/toast"

type ConfigurationFooterProps = {
  onCancel: () => void
  onSave?: () => Promise<void>
}

export function ConfigurationFooter({ onCancel, onSave }: ConfigurationFooterProps) {
  const { toast, loading: showLoading, dismiss } = useToast()
  const [saving, setSaving] = React.useState(false)

  const handleSave = async () => {
    if (!onSave) {
      toast({
        title: "Sin implementar",
        description: "La función de guardado aún no está disponible.",
        variant: "info",
      })
      return
    }
    setSaving(true)
    const loadingId = showLoading("Guardando configuración...", "Aplicando cambios")
    try {
      await onSave()
      dismiss(loadingId)
      toast({
        title: "Configuración guardada",
        description: "Los cambios se aplicaron correctamente.",
        variant: "success",
      })
    } catch (err) {
      dismiss(loadingId)
      toast({
        title: "Error al guardar",
        description: `${err}`,
        variant: "error",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-border/70 bg-muted/10 px-6 py-3.5">
      <Button
        variant="ghost"
        size="sm"
        type="button"
        onClick={onCancel}
        className="rounded-xl text-xs"
      >
        Cancelar
      </Button>
      <Button
        size="sm"
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="rounded-xl text-xs gap-1.5 font-medium"
      >
        {saving ? <Loader2Icon className="size-3.5 animate-spin" /> : null}
        {saving ? "Guardando..." : "Guardar y aplicar"}
      </Button>
    </footer>
  )
}
