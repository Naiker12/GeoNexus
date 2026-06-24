import type { SkillInfo } from "@/types/chat"

interface SkillPillsProps {
  skills: SkillInfo[]
  onRemove: (id: string) => void
}

export function SkillPills({ skills, onRemove }: SkillPillsProps) {
  if (skills.length === 0) return null

  return (
    <div className="mb-2 flex flex-wrap gap-1.5 px-2">
      {skills.map(skill => (
        <span
          key={skill.id}
          className="inline-flex items-center gap-1 rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary"
        >
          {skill.name}
          <button
            type="button"
            onClick={() => onRemove(skill.id)}
            className="hover:text-destructive ml-0.5"
          >
            ✕
          </button>
        </span>
      ))}
    </div>
  )
}
