import * as React from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"
import { GeoAgentsIcon } from "@/components/brand/GeoAgentsIcon"

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
  thinkingText?: string
}

export function ThinkingCard({ isVisible, currentStepLabel, thinkingText }: ThinkingCardProps) {
  const reduceMotion = useReducedMotion()
  const [textIndex, setTextIndex] = React.useState(0)
  const [fadeText, setFadeText] = React.useState(true)
  const showRotatingText = !currentStepLabel && !thinkingText
  const contentRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [thinkingText])

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
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -4, height: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <div className="mb-3 flex items-start gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
            <div className="relative shrink-0 mt-0.5">
              <GeoAgentsIcon className="size-4" variant="nexus" />
              {!reduceMotion && (
                <motion.span
                  className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-emerald-500"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <motion.span
                className="block text-sm text-muted-foreground"
                animate={{ opacity: fadeText ? 1 : 0.2 }}
                transition={{ duration: 0.3 }}
              >
                {thinkingText ? "Razonando..." : showRotatingText ? THINKING_TEXTS[textIndex] : currentStepLabel}
              </motion.span>

              {thinkingText && (
                <div
                  ref={contentRef}
                  className="mt-2 max-h-64 overflow-y-auto text-xs text-muted-foreground/80 leading-relaxed whitespace-pre-wrap font-mono border-t border-border/50 pt-2 scroll-smooth"
                  style={{ scrollbarWidth: "thin" }}
                >
                  {thinkingText}
                  <motion.span
                    className="inline-block size-1.5 ml-0.5 rounded-full bg-emerald-500"
                    animate={{ opacity: [1, 0.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  />
                </div>
              )}
            </div>

            <motion.div
              className="flex gap-1 ml-auto shrink-0 mt-1"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <span className="size-1.5 rounded-full bg-muted-foreground/50" />
              <span className="size-1.5 rounded-full bg-muted-foreground/50" />
              <span className="size-1.5 rounded-full bg-muted-foreground/50" />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
