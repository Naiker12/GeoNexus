import { useState } from "react"
import { cn } from "@/lib/utils"
import type { SkillCategory } from "@/types/skills"

interface SkillActivationBadgeProps {
  skillName: string
  skillCategory: SkillCategory | string
  skillDescription?: string
}

const CATEGORY_ICON: Record<string, string> = {
  gis: "🗺️", research: "🔍", data: "📊",
  agent: "🤖", tool: "⚡", connector: "🔌",
}

export function SkillActivationBadge({ skillName, skillCategory, skillDescription }: SkillActivationBadgeProps) {
  const [expanded, setExpanded] = useState(false)
  const icon = CATEGORY_ICON[skillCategory] ?? "🧩"

  return (
    <div className="my-1 rounded-lg border border-primary/20 bg-primary/5">
      <button
        onClick={() => setExpanded(p => !p)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <span>{icon}</span>
        <span className="text-xs font-medium">Skill activado: {skillName}</span>
        <span className="text-[10px] text-muted-foreground ml-auto">
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded && skillDescription && (
        <p className="px-3 pb-2 text-xs text-muted-foreground border-t border-primary/10 pt-1.5">
          {skillDescription}
        </p>
      )}
    </div>
  )
}
