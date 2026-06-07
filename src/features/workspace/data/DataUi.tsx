import { CheckCircle2Icon, Clock3Icon, AlertTriangleIcon, XCircleIcon } from "lucide-react"

import type { AssetStatus as AssetStatusType, SyncEventType } from "@/types/data"
import { statusLabel, eventTypeLabel } from "@/features/workspace/data/data-data"
import { cn } from "@/lib/utils"

export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/75 px-2.5 py-1.5">
      <p className="text-[0.62rem] leading-3 text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold leading-4">{value}</p>
    </div>
  )
}

export function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card/70 px-2.5 py-2">
      <p className="text-[0.68rem] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate text-xs">{value}</p>
    </div>
  )
}

export function AssetStatusBadge({ status }: { status: AssetStatusType }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit items-center rounded-md px-2 text-[0.7rem] font-medium",
        status === "ready" &&
          "bg-emerald-500/10 text-emerald-700 [.geo-dark_&]:text-emerald-300 [.graphite_&]:text-emerald-300 [.midnight_&]:text-emerald-300",
        status === "indexing" &&
          "bg-sky-500/10 text-sky-700 [.geo-dark_&]:text-sky-300 [.graphite_&]:text-sky-300 [.midnight_&]:text-sky-300",
        status === "pending" && "bg-muted text-muted-foreground",
        status === "conflict" && "bg-amber-500/10 text-amber-700 [.geo-dark_&]:text-amber-300 [.graphite_&]:text-amber-300 [.midnight_&]:text-amber-300",
        status === "error" && "bg-destructive/10 text-destructive"
      )}
    >
      {statusLabel[status]}
    </span>
  )
}

export function EventStatusBadge({ eventType }: { eventType: SyncEventType }) {
  const Icon =
    eventType === "indexed" || eventType === "downloaded" || eventType === "discovered"
      ? CheckCircle2Icon
      : eventType === "error"
        ? XCircleIcon
        : eventType === "conflict"
          ? AlertTriangleIcon
          : Clock3Icon

  const colorClass =
    eventType === "indexed" || eventType === "downloaded" || eventType === "discovered"
      ? "bg-emerald-500/10 text-emerald-700 [.geo-dark_&]:text-emerald-300 [.graphite_&]:text-emerald-300 [.midnight_&]:text-emerald-300"
      : eventType === "error"
        ? "bg-destructive/10 text-destructive"
        : eventType === "conflict"
          ? "bg-amber-500/10 text-amber-700 [.geo-dark_&]:text-amber-300"
          : "bg-muted text-muted-foreground"

  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-md px-1.5 text-[0.68rem] font-medium",
        colorClass
      )}
    >
      <Icon className="size-3" />
      {eventTypeLabel[eventType]}
    </span>
  )
}
