import { useState, useEffect, useRef } from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PipelineState, PipelineStep } from "./types"

const STEP_LABELS: Record<string, string> = {
  intent: "Clasificando intención",
  graph: "Cargando grafo de conocimiento",
  rag: "Buscando en documentos",
  context: "Construyendo contexto",
  web_search: "Buscando en la web",
  tool_call: "Ejecutando herramienta",
  generating: "Generando respuesta",
}

function StepRow({ step }: { step: PipelineStep }) {
  return (
    <div className="flex items-center gap-2.5 py-[3px]">
      <div className="flex w-4 shrink-0 items-center justify-center">
        {step.status === "done" && (
          <span className="text-[11px] font-medium text-emerald-600">✓</span>
        )}
        {step.status === "active" && (
          <span
            className="block h-[6px] w-[6px] rounded-full bg-amber-500"
            style={{ animation: "gn-pulse 1.2s ease-in-out infinite" }}
          />
        )}
        {step.status === "error" && (
          <span className="text-[11px] font-medium text-red-500">✕</span>
        )}
        {step.status === "pending" && (
          <span className="block h-[5px] w-[5px] rounded-full border border-stone-300" />
        )}
      </div>

      <span
        className={cn(
          "flex-1 text-xs",
          step.status === "done" && "text-stone-400",
          step.status === "active" && "font-medium text-stone-700",
          step.status === "error" && "text-red-600",
          step.status === "pending" && "text-stone-300",
        )}
      >
        {step.label ?? STEP_LABELS[step.kind] ?? step.kind}
        {step.status === "active" && "…"}
      </span>

      {step.metadata && (
        <span className="ml-2 font-mono text-[11px] text-stone-400">
          {step.metadata}
        </span>
      )}

      {step.status === "done" && step.durationMs !== undefined && (
        <span className="ml-1 font-mono text-[10px] text-stone-300">
          {step.durationMs < 1000
            ? `${step.durationMs}ms`
            : `${(step.durationMs / 1000).toFixed(1)}s`}
        </span>
      )}
    </div>
  )
}

export interface PipelineTraceProps {
  pipeline: PipelineState
}

export function PipelineTrace({ pipeline }: PipelineTraceProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const startRef = useRef(Date.now())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (pipeline.status === "running") {
      startRef.current = Date.now()
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startRef.current)
      }, 100)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [pipeline.status])

  useEffect(() => {
    if (pipeline.status === "completed") {
      const t = setTimeout(() => setCollapsed(true), 800)
      return () => clearTimeout(t)
    }
  }, [pipeline.status])

  const isRunning = pipeline.status === "running"
  const isError = pipeline.status === "error"
  const doneCount = pipeline.steps.filter((s) => s.status === "done").length
  const displayMs = pipeline.totalDurationMs ?? elapsedMs

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="mb-2 flex items-center gap-1.5 py-0.5 text-[12px] text-stone-400 transition-colors hover:text-stone-500"
      >
        <ChevronRight className="h-3 w-3" />
        <span className="text-[11px] text-emerald-500">✓</span>
        <span>
          Pipeline · {doneCount} pasos
          {pipeline.totalDurationMs !== undefined &&
            ` · ${(pipeline.totalDurationMs / 1000).toFixed(1)}s`}
        </span>
      </button>
    )
  }

  return (
    <>
      <style>{`
        @keyframes gn-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.45; transform: scale(0.75); }
        }
      `}</style>
      <div
        className={cn(
          "mb-3 overflow-hidden rounded-r-md border border-stone-200 border-l-2",
          isRunning ? "border-l-amber-400" : isError ? "border-l-red-400" : "border-l-emerald-400",
        )}
      >
        <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-3 py-2">
          <div className="flex items-center gap-2">
            {isRunning && (
              <span
                className="block h-1.5 w-1.5 rounded-full bg-amber-500"
                style={{ animation: "gn-pulse 1.5s ease-in-out infinite" }}
              />
            )}
            <span className="text-[12px] font-medium text-stone-600">
              {isRunning ? "Procesando" : isError ? "Error" : "Completado"}
            </span>
          </div>
          <span className="font-mono text-[11px] text-stone-400">
            {(displayMs / 1000).toFixed(1)}s
          </span>
        </div>

        <div className="bg-[#FDFBF8] px-3 py-2">
          {pipeline.steps.map((step) => (
            <StepRow key={step.id} step={step} />
          ))}
        </div>
      </div>
    </>
  )
}
