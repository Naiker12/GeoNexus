import * as React from "react"
import {
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Cpu,
  FileSearch,
  Globe,
  Sparkles,
} from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

export type StepStatus = "done" | "active" | "pending"

export interface ThinkingStep {
  id: string
  label: string
  icon: React.ReactNode
  status: StepStatus
}

interface ThinkingInlineProps {
  steps: ThinkingStep[]
  isComplete?: boolean
  expanded?: boolean
}

function Spinner({ className }: { className?: string }) {
  return (
    <span
      style={{ borderTopColor: "#10b981" }}
      className={cn(
        "inline-block size-3.5 shrink-0 animate-spin rounded-full border-2 border-muted",
        className
      )}
      aria-hidden="true"
    />
  )
}

function buildSummary(steps: ThinkingStep[], elapsed?: number): string {
  const active = steps.find((s) => s.status === "active")
  if (active) return active.label + (elapsed != null ? ` · ${elapsed.toFixed(1)}s` : "")
  const doneCount = steps.filter((s) => s.status === "done").length
  if (doneCount === steps.length) return `Razonamiento completado${elapsed != null ? ` · ${elapsed.toFixed(1)}s` : ""}`
  return `${doneCount} de ${steps.length} pasos completados`
}

export function ThinkingInline({
  steps,
  isComplete = false,
  expanded = false,
}: ThinkingInlineProps) {
  const [open, setOpen] = React.useState(expanded)
  const startRef = React.useRef(Date.now())
  const [elapsed, setElapsed] = React.useState<number | undefined>(undefined)

  React.useEffect(() => {
    if (isComplete) {
      setElapsed((Date.now() - startRef.current) / 1000)
      if (!expanded) {
        const t = setTimeout(() => setOpen(false), 1000)
        return () => clearTimeout(t)
      }
    } else {
      startRef.current = Date.now()
      const interval = setInterval(() => {
        setElapsed((Date.now() - startRef.current) / 1000)
      }, 200)
      return () => clearInterval(interval)
    }
  }, [isComplete, expanded])

  const summary = buildSummary(steps, elapsed)
  const allDone = steps.every((s) => s.status === "done")

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex cursor-pointer select-none items-center gap-1.5 py-0.5 text-sm text-muted-foreground transition-colors hover:text-foreground group w-full text-left"
        >
          <span className="shrink-0">
            {allDone ? (
              <Sparkles className="size-3.5 text-emerald-500" aria-hidden="true" />
            ) : (
              <Spinner />
            )}
          </span>
          <span className="text-xs font-medium text-muted-foreground/80">{summary}</span>
          <span className="ml-auto shrink-0">
            {open ? (
              <ChevronDown
                className="size-3 opacity-60"
                aria-hidden="true"
              />
            ) : (
              <ChevronRight
                className="size-3 opacity-60"
                aria-hidden="true"
              />
            )}
          </span>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="relative ml-0 mt-1 flex flex-col gap-0 rounded-lg bg-muted/30 px-3 py-2">
          <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-emerald-500/50" />
          {steps.map((step) => (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-2.5 py-1 pl-2.5",
                step.status === "pending" && "opacity-40"
              )}
            >
              <div className="flex size-3.5 shrink-0 items-center justify-center">
                {step.status === "done" && (
                  <CheckCircle2
                    className="size-3 text-emerald-500"
                    aria-hidden="true"
                  />
                )}
                {step.status === "active" && <Spinner className="size-3" />}
                {step.status === "pending" && (
                  <span className="text-muted-foreground/40">{step.icon}</span>
                )}
              </div>
              <span
                className={cn(
                  "font-mono text-[11px] leading-relaxed",
                  step.status === "done" && "text-muted-foreground",
                  step.status === "active" &&
                    "font-medium text-foreground",
                  step.status === "pending" && "text-muted-foreground/60"
                )}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export const DEFAULT_THINKING_STEPS: ThinkingStep[] = [
  {
    id: "parse",
    label: "Analizando mensaje",
    icon: <Sparkles className="size-3.5" />,
    status: "pending",
  },
  {
    id: "docs",
    label: "Buscando documentos relevantes",
    icon: <FileSearch className="size-3.5" />,
    status: "pending",
  },
  {
    id: "kb",
    label: "Consultando base de conocimiento",
    icon: <Globe className="size-3.5" />,
    status: "pending",
  },
  {
    id: "gen",
    label: "Generando respuesta",
    icon: <Cpu className="size-3.5" />,
    status: "pending",
  },
]
