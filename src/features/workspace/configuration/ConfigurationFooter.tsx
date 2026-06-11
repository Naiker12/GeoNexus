import * as React from "react"
import { Loader2Icon } from "lucide-react"

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
        description: "La funcion de guardado aun no esta disponible.",
        variant: "info",
      })
      return
    }
    setSaving(true)
    const loadingId = showLoading("Guardando configuracion...", "Aplicando cambios")
    try {
      await onSave()
      dismiss(loadingId)
      toast({
        title: "Configuracion guardada",
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
    <footer className="flex shrink-0 items-center justify-end gap-4 border-t border-border px-5 py-3">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button size="sm" type="button" onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : null}
          {saving ? "Guardando..." : "Guardar y aplicar"}
        </Button>
      </div>
    </footer>
  )
}
