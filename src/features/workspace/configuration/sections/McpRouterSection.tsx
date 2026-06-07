import * as React from "react"

import { McpRulesTable } from "@/features/workspace/configuration/McpRulesTable"
import { SettingsDialogs } from "@/features/workspace/configuration/SettingsDialogs"
import type { SettingsDialog } from "@/features/workspace/configuration/settings-types"

export function McpRouterSection() {
  const [dialog, setDialog] = React.useState<SettingsDialog>(null)

  return (
    <>
      <div className="grid gap-4">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-primary">
            MCP Router
          </h3>
          <p className="mt-1 text-xs leading-4 text-muted-foreground">
            Servidores y reglas activas del router Rust.
          </p>
        </div>

        <McpRulesTable onDialogChange={setDialog} />
      </div>

      <SettingsDialogs dialog={dialog} onOpenChange={setDialog} />
    </>
  )
}
