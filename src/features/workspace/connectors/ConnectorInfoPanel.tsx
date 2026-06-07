import { CheckCircle2Icon } from "lucide-react"
import type { ComponentType } from "react"

type ConnectorInfoPanelProps = {
  icon: ComponentType<{ className?: string }>
  title: string
  items: string[]
}

export function ConnectorInfoPanel({
  icon: Icon,
  title,
  items,
}: ConnectorInfoPanelProps) {
  return (
    <div className="rounded-lg border border-border bg-background/70 p-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="size-4 text-primary" />
        {title}
      </div>
      <div className="mt-2 grid gap-1.5">
        {items.map((item) => (
          <div
            key={item}
            className="flex items-start gap-2 text-sm text-muted-foreground"
          >
            <CheckCircle2Icon className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <span className="leading-5">{item}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
