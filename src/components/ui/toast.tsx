import { toast as sonnerToast } from "sonner"

export { Toaster } from "@/components/ui/sonner"

type ToastVariant = "info" | "success" | "warning" | "error"

type ToastInput = {
  title: string
  description?: string
  variant?: ToastVariant
  /** Keep toast visible until dismissed (for loading states) */
  persistent?: boolean
  /** Override default duration in ms */
  duration?: number
  /** Sonner toast id for later dismissal */
  id?: string | number
}

export function useToast() {
  return {
    toast: (input: ToastInput) => {
      const { title, description, variant = "info", persistent, duration, id } = input
      const opts = { description, duration: duration ?? (persistent ? Infinity : undefined), id }
      switch (variant) {
        case "success":
          return sonnerToast.success(title, opts)
        case "error":
          return sonnerToast.error(title, opts)
        case "warning":
          return sonnerToast.warning(title, opts)
        default:
          return sonnerToast.info(title, opts)
      }
    },
    loading: (title: string, description?: string) => {
      return sonnerToast.loading(title, { description })
    },
    dismiss: (id?: string | number) => sonnerToast.dismiss(id),
  }
}
