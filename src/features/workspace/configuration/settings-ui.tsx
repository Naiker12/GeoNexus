import { cn } from "@/lib/utils"
import type { Settings2Icon } from "lucide-react"
import type * as React from "react"

export function SettingGroup({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: typeof Settings2Icon | React.ComponentType<{ className?: string }>
  title: string
  description: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={cn("rounded-2xl border border-border/70 bg-card/90 p-4 shadow-2xs", className)}
    >
      <div className="mb-3.5 flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground border border-border/60">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground tracking-tight">{title}</h3>
          <p className="mt-0.5 text-xs leading-4 text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="grid gap-2.5">{children}</div>
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
    <label className="grid gap-1.5 text-xs font-medium text-foreground">
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
    <label className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5 text-xs cursor-pointer hover:bg-muted/40 transition-colors">
      <div className="min-w-0">
        <span className="font-medium text-foreground">{label}</span>
        {description && <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        className="size-4 accent-primary rounded shrink-0 cursor-pointer"
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
    <label className="flex h-9 items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 text-xs">
      <span className="truncate text-foreground font-medium">{label}</span>
      <input
        type="checkbox"
        defaultChecked={checked}
        className="size-3.5 accent-primary rounded cursor-pointer"
      />
    </label>
  )
}

export function SideMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
      <p className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="truncate text-sm font-semibold leading-5 text-foreground">{value}</p>
    </div>
  )
}
