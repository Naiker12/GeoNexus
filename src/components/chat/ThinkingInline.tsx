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

function buildSummary(steps: ThinkingStep[]): string {
  const visible = steps
    .filter((s) => s.status === "done" || s.status === "active")
    .map((s) => s.label.toLowerCase())
  if (visible.length === 0) return steps[0]?.label.toLowerCase() ?? "procesando"
  return visible.join(", ")
}

export function ThinkingInline({
  steps,
  isComplete = false,
}: ThinkingInlineProps) {
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    if (isComplete) {
      const t = setTimeout(() => setOpen(false), 1000)
      return () => clearTimeout(t)
    }
  }, [isComplete])

  const summary = buildSummary(steps)
  const allDone = steps.every((s) => s.status === "done")

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex cursor-pointer select-none items-center gap-1.5 py-0.5 text-sm text-muted-foreground transition-colors hover:text-foreground group"
        >
          {allDone ? (
            <CheckCircle2
              className="size-3.5 shrink-0 text-emerald-500"
              aria-hidden="true"
            />
          ) : (
            <Spinner />
          )}
          <span className="max-w-[380px] truncate">{summary}</span>
          {open ? (
            <ChevronDown
              className="size-3.5 shrink-0 opacity-60"
              aria-hidden="true"
            />
          ) : (
            <ChevronRight
              className="size-3.5 shrink-0 opacity-60"
              aria-hidden="true"
            />
          )}
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="ml-1 mt-1 flex flex-col gap-0 border-l border-border py-1 pl-4">
          {steps.map((step) => (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-2.5 py-1.5",
                step.status === "pending" && "opacity-40"
              )}
            >
              <div className="flex size-4 shrink-0 items-center justify-center">
                {step.status === "done" && (
                  <CheckCircle2
                    className="size-3.5 text-emerald-500"
                    aria-hidden="true"
                  />
                )}
                {step.status === "active" && <Spinner />}
                {step.status === "pending" && (
                  <span className="text-muted-foreground/60">{step.icon}</span>
                )}
              </div>
              <span
                className={cn(
                  "text-[13px] leading-snug",
                  step.status === "done" && "text-muted-foreground",
                  step.status === "active" &&
                    "font-medium text-foreground",
                  step.status === "pending" && "text-muted-foreground"
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
