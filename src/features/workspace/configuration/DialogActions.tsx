import { Button } from "@/components/ui/Button"

export function DialogActions({
  submitLabel,
  destructive = false,
  onCancel,
}: {
  submitLabel: string
  destructive?: boolean
  onCancel: () => void
}) {
  return (
    <div className="flex flex-col-reverse gap-2 border-t border-border pt-3 sm:flex-row sm:justify-end">
      <Button variant="outline" size="sm" type="button" onClick={onCancel}>
        Cancelar
      </Button>
      <Button variant={destructive ? "destructive" : "default"} size="sm" type="submit">
        {submitLabel}
      </Button>
    </div>
  )
}
