import { CheckCircle2Icon, Clock3Icon } from "lucide-react"

import type { DataAssetStatus, SyncEvent } from "@/features/workspace/data/data-data"
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

export function AssetStatus({ status }: { status: DataAssetStatus }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit items-center rounded-md px-2 text-[0.7rem] font-medium",
        status === "Indexado" &&
          "bg-emerald-500/10 text-emerald-700 [.geo-dark_&]:text-emerald-300 [.graphite_&]:text-emerald-300 [.midnight_&]:text-emerald-300",
        status === "Sincronizando" &&
          "bg-sky-500/10 text-sky-700 [.geo-dark_&]:text-sky-300 [.graphite_&]:text-sky-300 [.midnight_&]:text-sky-300",
        status === "Pendiente" && "bg-muted text-muted-foreground",
        status === "Conflicto" && "bg-destructive/10 text-destructive"
      )}
    >
      {status}
    </span>
  )
}

export function EventStatus({ status }: { status: SyncEvent["status"] }) {
  const Icon = status === "ok" ? CheckCircle2Icon : Clock3Icon

  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-md px-1.5 text-[0.68rem] font-medium",
        status === "ok" &&
          "bg-emerald-500/10 text-emerald-700 [.geo-dark_&]:text-emerald-300 [.graphite_&]:text-emerald-300 [.midnight_&]:text-emerald-300",
        status === "queued" && "bg-muted text-muted-foreground",
        status === "blocked" && "bg-destructive/10 text-destructive"
      )}
    >
      <Icon className="size-3" />
      {status}
    </span>
  )
}
