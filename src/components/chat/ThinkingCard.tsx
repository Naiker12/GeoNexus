import * as React from "react"
import { CheckCircle2, ChevronDown, Cpu, FileSearch, Globe, Sparkles } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Progress } from "@/components/ui/progress"

export type StepStatus = "done" | "active" | "pending"

export interface ThinkingStep {
  id: string
  label: string
  icon: React.ReactNode
  status: StepStatus
}

interface ThinkingCardProps {
  steps: ThinkingStep[]
  summary?: string
  isComplete?: boolean
  defaultOpen?: boolean
}

function Spinner() {
  return (
    <span
      className="block size-4 animate-spin rounded-full border-2 border-muted"
      style={{ borderTopColor: "#10b981" }}
      aria-hidden="true"
    />
  )
}

export function ThinkingCard({
  steps,
  summary,
  isComplete = false,
  defaultOpen = true,
}: ThinkingCardProps) {
  const [open, setOpen] = React.useState(defaultOpen)

  React.useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => setOpen(false), 800)
      return () => clearTimeout(timer)
    }
  }, [isComplete])

  const doneCount = steps.filter((s) => s.status === "done").length
  const progress = Math.round((doneCount / steps.length) * 100)

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="w-full max-w-sm">
      <CollapsibleTrigger className="w-full">
        <div className="flex cursor-pointer select-none items-center justify-between rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:bg-muted/50">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-emerald-500" aria-hidden="true" />
            <div className="text-left">
              <p className="mb-0.5 text-[10px] font-medium uppercase leading-none tracking-widest text-muted-foreground">
                Geo Agents
              </p>
              <p className="text-sm font-medium leading-none text-foreground">
                {isComplete ? "Análisis completado" : "Analizando tu consulta"}
              </p>
            </div>
          </div>
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform duration-200",
              open && "rotate-180"
            )}
            aria-hidden="true"
          />
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-1 overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex flex-col gap-0.5 px-4 pb-1 pt-3">
            {steps.map((step) => (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-2 py-2 transition-colors",
                  step.status === "active" && "bg-muted",
                  step.status === "pending" && "opacity-40"
                )}
              >
                <div className="flex size-5 shrink-0 items-center justify-center">
                  {step.status === "done" && (
                    <CheckCircle2 className="size-4 text-emerald-500" aria-hidden="true" />
                  )}
                  {step.status === "active" && <Spinner />}
                  {step.status === "pending" && (
                    <span className="text-muted-foreground">{step.icon}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-[13.5px] leading-snug",
                    step.status === "done" && "text-muted-foreground",
                    step.status === "active" && "font-medium text-foreground",
                    step.status === "pending" && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          <div className="px-4 pb-4 pt-2">
            <Progress value={progress} className="h-[2px]" />
          </div>
        </div>
      </CollapsibleContent>

      {!open && isComplete && summary ? (
        <div className="mt-1 rounded-lg px-4 py-2">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="size-3.5 text-emerald-500" aria-hidden="true" />
            {summary}
          </p>
        </div>
      ) : null}
    </Collapsible>
  )
}

export const DEFAULT_THINKING_STEPS: ThinkingStep[] = [
  {
    id: "parse",
    label: "Analizando mensaje",
    icon: <Sparkles className="size-4" />,
    status: "pending",
  },
  {
    id: "docs",
    label: "Buscando documentos relevantes",
    icon: <FileSearch className="size-4" />,
    status: "pending",
  },
  {
    id: "kb",
    label: "Consultando base de conocimiento",
    icon: <Globe className="size-4" />,
    status: "pending",
  },
  {
    id: "gen",
    label: "Generando respuesta",
    icon: <Cpu className="size-4" />,
    status: "pending",
  },
]
