import { useLanguage } from "@/i18n/useLanguage"
import { cn } from "@/lib/utils"
import {
  BrainIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ClockIcon,
  CopyIcon,
  SparklesIcon,
} from "lucide-react"
import * as React from "react"

interface ReasoningProps {
  content?: string
  isStreaming?: boolean
  durationMs?: number
  defaultOpen?: boolean
}

interface StepItem {
  id: string
  title?: string
  body: string
  isCompleted: boolean
}

/** Helper to parse unstructured reasoning text into timeline steps */
function parseReasoningSteps(raw: string, isStreaming: boolean): StepItem[] {
  if (!raw.trim()) return []

  // Split by common thinking markers: "1.", "###", "- Step", or double newlines with bold headers
  const lines = raw.split(/\n\n+/)
  if (lines.length <= 1) {
    return [
      {
        id: "step-0",
        title: undefined,
        body: raw.trim(),
        isCompleted: !isStreaming,
      },
    ]
  }

  return lines.map((chunk, idx) => {
    const isLast = idx === lines.length - 1
    const trimmed = chunk.trim()

    // Try extracting title if it starts with bold text or heading
    let title: string | undefined
    let body = trimmed

    const boldMatch = trimmed.match(/^(\*\*|###|#)(.+?)(\*\*|:|\n)/)
    if (boldMatch) {
      title = boldMatch[2].trim()
      body = trimmed.replace(boldMatch[0], "").trim()
    }

    return {
      id: `step-${idx}`,
      title,
      body: body || title || "",
      isCompleted: !isStreaming || !isLast,
    }
  })
}

export function Reasoning({
  content = "",
  isStreaming = false,
  durationMs,
  defaultOpen = false,
}: ReasoningProps) {
  const { language } = useLanguage()
  const [open, setOpen] = React.useState(defaultOpen || isStreaming)
  const [copied, setCopied] = React.useState(false)
  const [elapsedMs, setElapsedMs] = React.useState(0)
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = React.useRef<number>(Date.now())

  // Keep open while streaming
  React.useEffect(() => {
    if (isStreaming) {
      setOpen(true)
      startTimeRef.current = Date.now()
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startTimeRef.current)
      }, 100)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isStreaming])

  if (!content && !isStreaming) return null

  const steps = parseReasoningSteps(content, isStreaming)
  const finalDurationSec = durationMs
    ? (durationMs / 1000).toFixed(1)
    : elapsedMs > 0
      ? (elapsedMs / 1000).toFixed(1)
      : null

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!content) return
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const thinkingLabel =
    language === "es"
      ? isStreaming
        ? "Razonando paso a paso..."
        : finalDurationSec
          ? `Pensó durante ${finalDurationSec}s`
          : "Cadena de razonamiento"
      : isStreaming
        ? "Thinking step-by-step..."
        : finalDurationSec
          ? `Thought for ${finalDurationSec}s`
          : "Reasoning trace"

  return (
    <div
      className={cn(
        "my-2.5 rounded-2xl border transition-all duration-300 overflow-hidden text-xs",
        isStreaming
          ? "border-primary/40 bg-primary/5 shadow-xs"
          : "border-border/60 bg-muted/20 hover:border-border/80"
      )}
    >
      {/* ─── Header Collapsible Trigger ─── */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-3.5 py-2.5 text-left font-medium text-foreground/80 hover:text-foreground transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-lg transition-all",
              isStreaming
                ? "bg-primary/20 text-primary shadow-[0_0_12px_rgba(var(--primary),0.3)] animate-pulse"
                : "bg-muted text-muted-foreground"
            )}
          >
            {isStreaming ? (
              <SparklesIcon className="size-3.5 animate-spin" style={{ animationDuration: "3s" }} />
            ) : (
              <BrainIcon className="size-3.5 text-primary/80" />
            )}
          </div>

          <div className="flex items-center gap-2 min-w-0 truncate">
            <span className="font-semibold text-xs text-foreground tracking-tight truncate">
              {thinkingLabel}
            </span>

            {isStreaming && (
              <span className="flex items-center gap-1 font-mono text-[10px] text-primary/90">
                <ClockIcon className="size-2.5" />
                {(elapsedMs / 1000).toFixed(1)}s
              </span>
            )}

            {!isStreaming && steps.length > 1 && (
              <span className="rounded-full bg-muted/70 border border-border/50 px-2 py-0.2 text-[10px] font-mono text-muted-foreground">
                {steps.length} {language === "es" ? "pasos" : "steps"}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          {content && !isStreaming && (
            <button
              type="button"
              onClick={handleCopy}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
              title="Copiar traza de razonamiento"
            >
              {copied ? (
                <CheckCircle2Icon className="size-3 text-emerald-500" />
              ) : (
                <CopyIcon className="size-3" />
              )}
            </button>
          )}

          <ChevronDownIcon
            className={cn(
              "size-4 text-muted-foreground transition-transform duration-300",
              open && "rotate-180"
            )}
          />
        </div>
      </button>

      {/* ─── Collapsible Trace Body / Timeline ─── */}
      {open && (
        <div className="border-t border-border/40 bg-background/50 px-4 py-3 text-xs animate-in fade-in-50 duration-200">
          <div className="relative pl-5 space-y-3.5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1.5px] before:bg-border/60">
            {steps.map((step, idx) => {
              const isCurrentStreaming = isStreaming && idx === steps.length - 1

              return (
                <div key={step.id} className="relative group">
                  {/* Timeline node icon */}
                  <div
                    className={cn(
                      "absolute -left-5 top-1 size-2 rounded-full border transition-all",
                      isCurrentStreaming
                        ? "bg-primary border-primary ring-3 ring-primary/20 animate-ping"
                        : step.isCompleted
                          ? "bg-primary/80 border-primary/90"
                          : "bg-muted border-border"
                    )}
                  />

                  {/* Step Content */}
                  <div className="space-y-1">
                    {step.title && (
                      <h4 className="font-semibold text-xs text-foreground/90 font-sans">
                        {step.title}
                      </h4>
                    )}
                    <div className="text-[12px] font-sans leading-relaxed text-muted-foreground/90 whitespace-pre-wrap">
                      {step.body}
                      {isCurrentStreaming && (
                        <span className="inline-block w-1.5 h-3 ml-1 bg-primary animate-pulse align-middle rounded-xs" />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
