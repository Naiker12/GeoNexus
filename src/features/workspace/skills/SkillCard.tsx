import { cn } from "@/lib/utils"
import type { Skill, SkillCategory } from "@/types/skills"

interface SkillCardProps {
  skill: Skill
  onToggle: (id: string, enabled: boolean) => void
  onView: (id: string) => void
  onUseInChat: (skill: Skill) => void
}

const CATEGORY_CONFIG: Record<SkillCategory, { icon: string; color: string; label: string }> = {
  gis:       { icon: "🗺️", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400", label: "GIS" },
  research:  { icon: "🔍", color: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400", label: "Research" },
  data:      { icon: "📊", color: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400", label: "Datos" },
  agent:     { icon: "🤖", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400", label: "Agente" },
  tool:      { icon: "⚡", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400", label: "Tool" },
  connector: { icon: "🔌", color: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400", label: "Conector" },
}

export function SkillCard({ skill, onToggle, onView, onUseInChat }: SkillCardProps) {
  const cat = CATEGORY_CONFIG[skill.category]

  return (
    <div className={cn(
      "rounded-xl border p-4 transition-all",
      skill.enabled ? "border-border bg-card/95" : "border-border/50 bg-muted/30 opacity-60"
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0">{cat.icon}</span>
          <div className="min-w-0">
            <h3 className="font-medium text-sm leading-tight truncate">{skill.name}</h3>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", cat.color)}>
                {cat.label}
              </span>
              <span className="text-[10px] text-muted-foreground">v{skill.version}</span>
              {skill.builtin && (
                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                  built-in
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => onToggle(skill.id, !skill.enabled)}
          className={cn(
            "w-10 h-5 rounded-full transition-colors relative shrink-0",
            skill.enabled ? "bg-primary" : "bg-muted-foreground/30"
          )}
          title={skill.enabled ? "Desactivar" : "Activar"}
        >
          <span className={cn(
            "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
            skill.enabled ? "translate-x-5" : "translate-x-0.5"
          )} />
        </button>
      </div>

      {skill.description && (
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
          {skill.description}
        </p>
      )}

      {skill.mcpServers.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {skill.mcpServers.map(mcp => (
            <span key={mcp} className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">
              {mcp}
            </span>
          ))}
        </div>
      )}

      {skill.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {skill.tags.slice(0, 4).map(tag => (
            <span key={tag} className="text-[10px] text-muted-foreground">#{tag}</span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-3">
        <span>Usado {skill.useCount}x</span>
        {skill.author && <span className="truncate">por {skill.author}</span>}
        {skill.sourceUrl && (
          <a href={skill.sourceUrl} target="_blank" rel="noreferrer"
             className="text-primary hover:underline shrink-0">
            GitHub ↗
          </a>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onView(skill.id)}
          className="flex-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          Ver SKILL.md
        </button>
        <button
          onClick={() => onUseInChat(skill)}
          disabled={!skill.enabled}
          className="flex-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40"
        >
          Usar en chat
        </button>
      </div>
    </div>
  )
}
