import * as React from "react"

type UsePasteImageOptions = {
  onImage: (file: File, dataUrl: string) => void
  enabled?: boolean
}

function usePasteImage({ onImage, enabled = true }: UsePasteImageOptions) {
  React.useEffect(() => {
    if (!enabled) return

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.startsWith("image/")) {
          e.preventDefault()
          const file = item.getAsFile()
          if (!file) continue

          const reader = new FileReader()
          reader.onload = () => {
            if (typeof reader.result === "string") {
              onImage(file, reader.result)
            }
          }
          reader.readAsDataURL(file)
          break
        }
      }
    }

    document.addEventListener("paste", handlePaste)
    return () => document.removeEventListener("paste", handlePaste)
  }, [onImage, enabled])
}

export { usePasteImage }
export type { UsePasteImageOptions }
