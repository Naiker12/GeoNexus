import * as React from "react"
import { cn } from "@/lib/utils"
import { Bot } from "lucide-react"

const THINKING_TEXTS = [
  "Analizando tu consulta...",
  "Consultando el contexto...",
  "Procesando información...",
  "Generando respuesta...",
  "Revisando datos relevantes...",
]

interface ThinkingCardProps {
  isVisible: boolean
  currentStepLabel?: string
}

export function ThinkingCard({ isVisible, currentStepLabel }: ThinkingCardProps) {
  const [textIndex, setTextIndex] = React.useState(0)
  const [fadeText, setFadeText] = React.useState(true)
  const showRotatingText = !currentStepLabel

  React.useEffect(() => {
    if (!isVisible || !showRotatingText) return
    const interval = setInterval(() => {
      setFadeText(false)
      setTimeout(() => {
        setTextIndex(i => (i + 1) % THINKING_TEXTS.length)
        setFadeText(true)
      }, 300)
    }, 2000)
    return () => clearInterval(interval)
  }, [isVisible, showRotatingText])

  React.useEffect(() => {
    if (!isVisible) {
      setTextIndex(0)
      setFadeText(true)
    }
  }, [isVisible])

  return (
    <div
      className={cn(
        "transition-all duration-300 ease-in-out overflow-hidden",
        isVisible
          ? "opacity-100 max-h-24 mb-3"
          : "opacity-0 max-h-0 mb-0",
      )}
    >
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-muted/40">
        <div className="relative shrink-0">
          <Bot className="size-4 text-muted-foreground" />
          <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-green-500 animate-pulse" />
        </div>

        <span
          className={cn(
            "text-sm text-muted-foreground transition-opacity duration-300",
            fadeText ? "opacity-100" : "opacity-0",
          )}
        >
          {showRotatingText ? THINKING_TEXTS[textIndex] : currentStepLabel}
        </span>

        <div className="ml-auto flex gap-1">
          <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
          <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
          <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  )
}
