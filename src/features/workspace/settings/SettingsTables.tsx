import {
  BrainCircuitIcon,
  MapIcon,
  ServerIcon,
} from "lucide-react"

import { AiModelsTable } from "@/features/workspace/settings/AiModelsTable"
import { MapSettingsPanel } from "@/features/workspace/settings/MapSettingsPanel"
import { McpRulesTable } from "@/features/workspace/settings/McpRulesTable"
import type { SettingsDialog } from "@/features/workspace/settings/settings-types"
import { SettingGroup } from "@/features/workspace/settings/settings-ui"

export function CoreSettings({
  onDialogChange,
}: {
  onDialogChange: (dialog: SettingsDialog) => void
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-border/80 bg-card/95 shadow-sm backdrop-blur">
      <div className="border-b border-border px-3 py-2">
        <h2 className="text-sm font-semibold">Ajustes principales</h2>
        <p className="text-xs leading-4 text-muted-foreground">
          Valores que luego se persistiran por Tauri commands y SQLite.
        </p>
      </div>

      <div className="grid gap-3 p-3 lg:grid-cols-2">
        <SettingGroup
          icon={BrainCircuitIcon}
          title="IA y embeddings"
          description="Modelos registrados, claves guardadas y estado de uso."
          className="lg:col-span-2"
        >
          <AiModelsTable onDialogChange={onDialogChange} />
        </SettingGroup>

        <SettingGroup
          icon={ServerIcon}
          title="MCP Router"
          description="Servidores y reglas activas del router Rust."
          className="lg:col-span-2"
        >
          <McpRulesTable onDialogChange={onDialogChange} />
        </SettingGroup>

        <SettingGroup
          icon={MapIcon}
          title="Mapas"
          description="Motores disponibles, rendimiento, capas y exportacion."
          className="lg:col-span-2"
        >
          <MapSettingsPanel onDialogChange={onDialogChange} />
        </SettingGroup>
      </div>
    </section>
  )
}
