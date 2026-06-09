import * as React from "react"
import {
  CheckIcon,
  FileSearchIcon,
  GlobeIcon,
  MessageSquareTextIcon,
  SearchIcon,
  SparklesIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

type StepId = "analyze" | "retrieve" | "context" | "generate"

type StepDef = {
  id: StepId
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const STEPS: StepDef[] = [
  { id: "analyze", label: "Analizando mensaje...", icon: SearchIcon },
  { id: "retrieve", label: "Buscando documentos relevantes...", icon: FileSearchIcon },
  { id: "context", label: "Consultando base de conocimiento...", icon: GlobeIcon },
  { id: "generate", label: "Generando respuesta...", icon: SparklesIcon },
]

function ChatAnalysisLoader() {
  const [stepIndex, setStepIndex] = React.useState(0)

  React.useEffect(() => {
    setStepIndex(0)
    const timer = setInterval(() => {
      setStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1))
    }, 1800)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="grid gap-2.5">
      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
        <MessageSquareTextIcon className="size-4 text-primary" />
        GeoNexus esta analizando tu consulta
      </p>

      <div className="grid gap-1.5">
        {STEPS.map((step, i) => {
          const isActive = i === stepIndex
          const isDone = i < stepIndex

          return (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs transition-all duration-300",
                isActive && "bg-primary/5 text-foreground",
                isDone && "text-muted-foreground/60",
                !isActive && !isDone && "text-muted-foreground/30"
              )}
            >
              <span className="relative flex size-5 shrink-0 items-center justify-center">
                {isActive ? (
                  <span className="inline-block size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                ) : isDone ? (
                  <span className="flex size-4 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <CheckIcon className="size-3" />
                  </span>
                ) : (
                  <step.icon className="size-4" />
                )}
              </span>
              <span
                className={cn(
                  "transition-opacity duration-300",
                  isActive && "font-medium text-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>

      <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
          style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
        />
      </div>
    </div>
  )
}

export { ChatAnalysisLoader }
