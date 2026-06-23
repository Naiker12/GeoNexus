import { Brain } from "lucide-react"

import { cn } from "@/lib/utils"

export type ReasoningEffort = "none" | "minimal" | "medium" | "high" | "max"

interface ReasoningToggleProps {
  value: ReasoningEffort
  onChange: (v: ReasoningEffort) => void
}

const EFFORTS: { value: ReasoningEffort; label: string }[] = [
  { value: "none", label: "Off" },
  { value: "minimal", label: "Mínimo" },
  { value: "medium", label: "Medio" },
  { value: "high", label: "Alto" },
  { value: "max", label: "Máximo" },
]

export function ReasoningToggle({ value, onChange }: ReasoningToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <Brain className="w-4 h-4 text-muted-foreground" />
      <div className="flex gap-1 flex-wrap">
        {EFFORTS.map((e) => (
          <button
            key={e.value}
            onClick={() => onChange(e.value)}
            className={cn(
              "px-2 py-0.5 rounded text-xs font-medium transition-colors",
              value === e.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {e.label}
          </button>
        ))}
      </div>
    </div>
  )
}
