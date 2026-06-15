import * as React from "react"
import { Sparkles, ChevronRight, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ReasoningStepItem } from "@/components/chat/ReasoningStepItem"
import { ThinkingTextBlock } from "@/components/chat/ThinkingTextBlock"
import { ToolCallItem } from "@/components/chat/ToolCallItem"
import type { ReasoningStepDisplay, ToolCallDisplay } from "@/types/chat"

interface ReasoningPanelProps {
  steps: ReasoningStepDisplay[]
  isRunning: boolean
  startTime?: number | null
  sourceCount?: number
  intent?: string
  userQuery?: string
  thinkingText?: string
  toolCalls?: ToolCallDisplay[]
}

export function ReasoningPanel({ 
  steps, 
  isRunning, 
  startTime, 
  sourceCount, 
  intent, 
  userQuery,
  thinkingText = "",
  toolCalls = []
}: ReasoningPanelProps) {
  const [open, setOpen] = React.useState(true)
  const [elapsed, setElapsed] = React.useState(0)

  React.useEffect(() => {
    if (!startTime) return
    if (!isRunning && (steps.length > 0 || thinkingText.length > 0 || toolCalls.length > 0)) {
      setElapsed((Date.now() - startTime) / 1000)
      const t = setTimeout(() => setOpen(false), 800)
      return () => clearTimeout(t)
    }
    setOpen(true)
    const id = setInterval(() => {
      setElapsed((Date.now() - startTime) / 1000)
    }, 100)
    return () => clearInterval(id)
  }, [startTime, isRunning, steps.length, thinkingText.length, toolCalls.length])

  const hasContent = steps.length > 0 || thinkingText.length > 0 || toolCalls.length > 0 || isRunning
  if (!hasContent) return null

  const allDone = !isRunning && hasContent
  const lastStep = steps[steps.length - 1]
  const toolCallDoneCount = toolCalls.filter(t => t.status === "success" || t.status === "error").length
  const skillsCount = steps.filter(s => s.type === "skills_injected").length
  const stepsCount = steps.filter(s => s.status === "done").length

  const INTENT_HEADERS: Record<string, string> = {
    consulta_general: "Respondido",
    consulta_normativa: "Análisis normativo",
    analisis_espacial: "Análisis espacial",
    descubrimiento_datos: "Datos encontrados",
    memoria_proyecto: "Contexto recuperado",
    generacion_entregable: "Entregable generado",
  }

  const summary = allDone
    ? `${INTENT_HEADERS[intent ?? ""] ?? "Completado"} · ${stepsCount} pasos · ${elapsed.toFixed(1)}s${sourceCount ? ` · ${sourceCount} fuentes` : ""}`
    : lastStep
      ? `${lastStep.label} · ${elapsed.toFixed(1)}s`
      : `Analizando · ${elapsed.toFixed(1)}s`

  const hasSteps = steps.length > 0
  const hasThinking = thinkingText.length > 0
  const hasTools = toolCalls.length > 0
  const hasDivider = hasSteps && hasThinking

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex cursor-pointer select-none items-center gap-1.5 py-0.5 text-sm text-muted-foreground transition-colors hover:text-foreground w-full text-left",
            !allDone && "mb-1"
          )}
        >
          <span className="shrink-0">
            {allDone
              ? <Sparkles className="size-3.5 text-emerald-500" />
              : (
                <span
                  style={{ borderTopColor: "#10b981" }}
                  className="inline-block size-3.5 shrink-0 animate-spin rounded-full border-2 border-muted"
                />
              )
            }
          </span>
          <span className="text-xs font-medium text-muted-foreground/80 truncate">
            {summary}
          </span>
          {toolCallDoneCount > 0 && allDone && (
            <span className="text-[10px] text-muted-foreground/40 shrink-0">
              · {toolCallDoneCount} tool{toolCallDoneCount !== 1 ? "s" : ""}
            </span>
          )}
          {skillsCount > 0 && allDone && (
            <span className="text-[10px] text-muted-foreground/40 shrink-0">
              · {skillsCount} skill{skillsCount !== 1 ? "s" : ""}
            </span>
          )}
          <span className="ml-auto shrink-0">
            {open
              ? <ChevronDown className="size-3 opacity-60" />
              : <ChevronRight className="size-3 opacity-60" />
            }
          </span>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className={cn(
          "relative ml-0 mt-1 flex flex-col gap-1 px-3 py-1",
          isRunning ? "border-l-2 border-indigo-500/50" : "border-l-2 border-border/30"
        )}>
          {/* Structured Steps */}
          {hasSteps && (
            <div className="flex flex-col gap-0">
              {steps.map((step, i) => (
                <ReasoningStepItem key={step.id} step={step} />
              ))}
            </div>
          )}

          {/* Divider */}
          {hasDivider && (
            <div className="h-px bg-border/30 my-1 opacity-70" />
          )}

          {/* Thinking Text Scratchpad */}
          {hasThinking && (
            <ThinkingTextBlock text={thinkingText} isStreaming={isRunning} />
          )}

          {/* Tool Calls */}
          {hasTools && (
            <div className="flex flex-col gap-0 pt-1">
              {toolCalls.map((tool) => (
                <ToolCallItem key={tool.id} tool={tool} />
              ))}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
