import { toast as sonnerToast } from "sonner"

export { Toaster } from "@/components/ui/sonner"

type ToastVariant = "info" | "success" | "warning" | "error"

type ToastInput = {
  title: string
  description?: string
  variant?: ToastVariant
}

export function useToast() {
  return {
    toast: (input: ToastInput) => {
      const { title, description, variant = "info" } = input
      switch (variant) {
        case "success":
          sonnerToast.success(title, { description })
          break
        case "error":
          sonnerToast.error(title, { description })
          break
        case "warning":
          sonnerToast.warning(title, { description })
          break
        default:
          sonnerToast.info(title, { description })
      }
    },
    dismiss: (id: string | number) => sonnerToast.dismiss(id),
  }
}
