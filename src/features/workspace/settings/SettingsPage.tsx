import * as React from "react"

import { SettingsDialogs } from "@/features/workspace/settings/SettingsDialogs"
import { SettingsHeader } from "@/features/workspace/settings/SettingsHeader"
import {
  LocalPathsPanel,
  MaintenancePanel,
  MapRuntimePanel,
  MemoryRuntimePanel,
  RuntimePanel,
} from "@/features/workspace/settings/SettingsSidePanels"
import { CoreSettings } from "@/features/workspace/settings/SettingsTables"
import type { SettingsDialog } from "@/features/workspace/settings/settings-types"

export function SettingsPage() {
  const [dialog, setDialog] = React.useState<SettingsDialog>(null)

  return (
    <section className="relative z-10 h-[calc(100svh-3.5rem)] overflow-auto px-3 py-3 sm:px-5 sm:py-4">
      <div className="mx-auto grid w-full max-w-[110rem] gap-3">
        <SettingsHeader />

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="grid min-w-0 gap-3">
            <CoreSettings onDialogChange={setDialog} />
            <LocalPathsPanel />
          </div>
          <aside className="grid content-start gap-3">
            <RuntimePanel />
            <MapRuntimePanel />
            <MemoryRuntimePanel />
            <MaintenancePanel />
          </aside>
        </div>
      </div>

      <SettingsDialogs dialog={dialog} onOpenChange={setDialog} />
    </section>
  )
}
