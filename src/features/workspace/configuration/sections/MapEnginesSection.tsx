import * as React from "react"

import { MapSettingsPanel } from "@/features/workspace/configuration/MapSettingsPanel"
import { SettingsDialogs } from "@/features/workspace/configuration/SettingsDialogs"
import type { SettingsDialog } from "@/features/workspace/configuration/settings-types"

export function MapEnginesSection() {
  const [dialog, setDialog] = React.useState<SettingsDialog>(null)

  return (
    <>
      <div className="grid gap-4">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-primary">
            Motores de mapa
          </h3>
          <p className="mt-1 text-xs leading-4 text-muted-foreground">
            Motores disponibles, rendimiento, capas y exportación.
          </p>
        </div>

        <MapSettingsPanel onDialogChange={setDialog} />
      </div>

      <SettingsDialogs dialog={dialog} onOpenChange={setDialog} />
    </>
  )
}
