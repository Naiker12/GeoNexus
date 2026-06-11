import { Button } from "@/components/ui/Button"

type ConfigurationFooterProps = {
  onCancel: () => void
}

export function ConfigurationFooter({ onCancel }: ConfigurationFooterProps) {
  return (
    <footer className="flex shrink-0 items-center justify-end gap-4 border-t border-border px-5 py-3">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button size="sm" type="button">
          Guardar y aplicar
        </Button>
      </div>
    </footer>
  )
}
