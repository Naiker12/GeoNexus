import * as React from "react"
import { Puzzle } from "lucide-react"
import { cn } from "@/lib/utils"

interface SkillActivationToastProps {
  skillName: string
  onDismiss: () => void
}

export function SkillActivationToast({ skillName, onDismiss }: SkillActivationToastProps) {
  const [visible, setVisible] = React.useState(true)

  React.useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false)
      onDismiss()
    }, 2000)
    return () => clearTimeout(t)
  }, [onDismiss])

  if (!visible) return null

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-1",
        "animate-in fade-in slide-in-from-top-1 duration-300"
      )}
    >
      <Puzzle className="size-3 text-amber-500" />
      <span className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
        {skillName} activado para este mensaje
      </span>
    </div>
  )
}
