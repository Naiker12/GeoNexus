import * as React from "react"
import { CheckCircle2Icon, InfoIcon, TriangleAlertIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"

type ToastVariant = "info" | "success" | "warning" | "error"

type ToastInput = {
  title: string
  description?: string
  variant?: ToastVariant
}

type ToastItem = ToastInput & {
  id: string
  variant: ToastVariant
}

type ToastContextValue = {
  toast: (input: ToastInput) => void
  dismiss: (id: string) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([])

  const dismiss = React.useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const toast = React.useCallback(
    (input: ToastInput) => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`
      const item: ToastItem = {
        ...input,
        id,
        variant: input.variant ?? "info",
      }

      setItems((current) => [item, ...current].slice(0, 4))
      window.setTimeout(() => dismiss(id), 4200)
    },
    [dismiss]
  )

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <ToastViewport items={items} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error("useToast debe usarse dentro de ToastProvider")
  }
  return context
}

function ToastViewport({
  items,
  onDismiss,
}: {
  items: ToastItem[]
  onDismiss: (id: string) => void
}) {
  if (!items.length) return null

  return (
    <div className="fixed bottom-4 right-4 z-[1001] grid w-[min(92vw,24rem)] gap-2">
      {items.map((item) => (
        <ToastCard key={item.id} item={item} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem
  onDismiss: (id: string) => void
}) {
  const Icon = variantIcon[item.variant]

  return (
    <article className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-2 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-xl shadow-black/10">
      <div
        className={cn(
          "mt-0.5 flex size-7 items-center justify-center rounded-md",
          variantClassName[item.variant]
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{item.title}</p>
        {item.description ? (
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
            {item.description}
          </p>
        ) : null}
      </div>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="Cerrar notificacion"
        onClick={() => onDismiss(item.id)}
      >
        <XIcon className="size-3.5" />
      </Button>
    </article>
  )
}

const variantIcon = {
  info: InfoIcon,
  success: CheckCircle2Icon,
  warning: TriangleAlertIcon,
  error: TriangleAlertIcon,
}

const variantClassName: Record<ToastVariant, string> = {
  info: "bg-primary/10 text-primary",
  success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  warning: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  error: "bg-destructive/15 text-destructive",
}
