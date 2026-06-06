import { CircleIcon } from "lucide-react"

import { GeoNexusIcon } from "@/components/brand/GeoNexusIcon"
import { cn } from "@/lib/utils"

type AiStatusPillProps = {
  connector: string
  model: string
  status: "online" | "offline" | "needs-key"
  className?: string
}

export function AiStatusPill({
  connector,
  model,
  status,
  className,
}: AiStatusPillProps) {
  const isOnline = status === "online"

  return (
    <div
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-full border px-3 text-sm font-medium",
        isOnline
          ? "border-primary/20 bg-primary/10 text-primary"
          : "border-border bg-muted text-muted-foreground",
        className
      )}
    >
      <CircleIcon
        className={cn("size-2 fill-current", isOnline && "text-primary")}
      />
      <GeoNexusIcon className="size-4" variant="agent" />
      <span>{connector}</span>
      <span className="text-current/60">-</span>
      <span>{model}</span>
    </div>
  )
}
