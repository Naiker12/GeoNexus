import * as React from "react"
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  CloudIcon,
  DatabaseIcon,
  GlobeIcon,
  HardDriveIcon,
  MapIcon,
  SearchIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

export type SearchSource = "onedrive" | "local" | "chromadb" | "web" | "qgis"

export type SearchStepStatus = "searching" | "found" | "empty" | "error"

export interface SearchStep {
  source: SearchSource
  status: SearchStepStatus
  label: string
  count?: number
}

interface SearchingIndicatorProps {
  steps: SearchStep[]
}

const sourceConfig: Record<SearchSource, { icon: typeof SearchIcon; color: string }> = {
  onedrive: { icon: CloudIcon, color: "text-sky-500" },
  local: { icon: HardDriveIcon, color: "text-emerald-500" },
  chromadb: { icon: DatabaseIcon, color: "text-violet-500" },
  web: { icon: GlobeIcon, color: "text-blue-500" },
  qgis: { icon: MapIcon, color: "text-lime-500" },
}

function SpinnerSmall() {
  return (
    <span
      className="inline-block size-3 animate-spin rounded-full border-2 border-muted"
      style={{ borderTopColor: "currentColor" }}
      aria-hidden="true"
    />
  )
}

export function SearchingIndicator({ steps }: SearchingIndicatorProps) {
  if (steps.length === 0) return null

  return (
    <div className="my-2 flex flex-col gap-1 rounded-lg border border-border bg-muted/30 px-3 py-2">
      {steps.map((step, i) => {
        const config = sourceConfig[step.source]
        const Icon = config.icon

        return (
          <div
            key={`${step.source}-${i}`}
            className="flex items-center gap-2 text-xs"
          >
            <div className={cn("flex size-4 items-center justify-center", config.color)}>
              <Icon className="size-3.5" />
            </div>

            <span className="flex-1 text-muted-foreground">{step.label}</span>

            <div className="flex items-center gap-1">
              {step.status === "searching" && (
                <SpinnerSmall />
              )}
              {step.status === "found" && (
                <>
                  <span className="font-medium text-foreground">{step.count}</span>
                  <CheckCircle2Icon className="size-3 text-emerald-500" />
                </>
              )}
              {step.status === "empty" && (
                <span className="text-muted-foreground/60">0</span>
              )}
              {step.status === "error" && (
                <AlertCircleIcon className="size-3 text-destructive" />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
