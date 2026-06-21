import * as React from "react"
import { Settings2Icon } from "lucide-react"

import { cn } from "@/lib/utils"

export function SettingGroup({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: typeof Settings2Icon
  title: string
  description: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        "rounded-lg border border-border bg-background/75 p-3",
        className
      )}
    >
      <div className="mb-3 flex items-start gap-2">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-3.5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <div className="grid gap-2">{children}</div>
    </section>
  )
}

export function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      {children}
    </label>
  )
}

export function CheckRow({
  label,
  description,
  checked = false,
  onCheckedChange,
}: {
  label: string
  description?: string
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md border border-border bg-card/70 px-2.5 py-2 text-sm">
      <div className="min-w-0">
        <span className="text-muted-foreground">{label}</span>
        {description && <p className="text-[0.65rem] text-muted-foreground/60 mt-0.5">{description}</p>}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        className="size-4 accent-[var(--primary)] shrink-0"
      />
    </label>
  )
}

export function CompactCheckRow({
  label,
  checked = false,
}: {
  label: string
  checked?: boolean
}) {
  return (
    <label className="flex h-8 items-center justify-between gap-2 rounded-md border border-border bg-background/75 px-2.5 text-xs">
      <span className="truncate text-muted-foreground">{label}</span>
      <input
        type="checkbox"
        defaultChecked={checked}
        className="size-3.5 accent-[var(--primary)]"
      />
    </label>
  )
}

export function SideMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/75 px-2.5 py-2">
      <p className="text-[0.68rem] leading-4 text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-semibold leading-5">{value}</p>
    </div>
  )
}
