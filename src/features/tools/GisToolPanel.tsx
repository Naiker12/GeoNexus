import { CheckIcon, LockIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import type { GisTool } from "@/types/workspace-types"

type GisToolPanelProps = {
  tools: GisTool[]
}

export function GisToolPanel({ tools }: GisToolPanelProps) {
  return (
    <section className="rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm">
      <div>
        <h2 className="font-semibold">Herramientas GIS</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tools MCP disponibles para el LLM activo y la UI.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        {tools.map((tool) => {
          const ready = tool.status === "ready"

          return (
            <button
              key={tool.name}
              className={cn(
                "group flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                ready
                  ? "border-border bg-background hover:bg-muted"
                  : "border-dashed border-border bg-muted/40"
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md",
                  ready
                    ? "bg-emerald-50 text-emerald-700 [.geo-dark_&]:bg-emerald-500/10 [.geo-dark_&]:text-emerald-300 [.graphite_&]:bg-emerald-500/10 [.graphite_&]:text-emerald-300 [.midnight_&]:bg-emerald-500/10 [.midnight_&]:text-emerald-300"
                    : "bg-slate-100 text-slate-500 [.geo-dark_&]:bg-muted [.geo-dark_&]:text-muted-foreground [.graphite_&]:bg-muted [.graphite_&]:text-muted-foreground [.midnight_&]:bg-muted [.midnight_&]:text-muted-foreground"
                )}
              >
                <tool.icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-medium">{tool.name}</h3>
                  {ready ? (
                    <CheckIcon className="size-4 text-emerald-600 [.geo-dark_&]:text-emerald-300 [.graphite_&]:text-emerald-300 [.midnight_&]:text-emerald-300" />
                  ) : (
                    <LockIcon className="size-4 text-muted-foreground" />
                  )}
                </div>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">
                  {tool.description}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {tool.server}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
