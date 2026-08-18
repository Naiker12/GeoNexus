import * as React from "react"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { ConfigurationFooter } from "@/features/workspace/configuration/ConfigurationFooter"
import { ConfigurationHeader } from "@/features/workspace/configuration/ConfigurationHeader"
import { ConfigurationSidebar } from "@/features/workspace/configuration/ConfigurationSidebar"
import type { ConfigSectionId } from "@/features/workspace/configuration/configuration-types"
import { AiEmbeddingsSection } from "@/features/workspace/configuration/sections/AiEmbeddingsSection"
import { AllowedPathsSection } from "@/features/workspace/configuration/sections/AllowedPathsSection"
import { AppearanceSection } from "@/features/workspace/configuration/sections/AppearanceSection"
import { ConnectorsSection } from "@/features/workspace/configuration/sections/ConnectorsSection"
import { LocalPathsSection } from "@/features/workspace/configuration/sections/LocalPathsSection"
import { MaintenanceSection } from "@/features/workspace/configuration/sections/MaintenanceSection"
import { McpRouterSection } from "@/features/workspace/configuration/sections/McpRouterSection"
import { MemorySection } from "@/features/workspace/configuration/sections/MemorySection"
import { TelegramIntegrationPanel } from "@/features/workspace/configuration/sections/TelegramIntegrationPanel"

import { AgentsSection } from "@/features/workspace/configuration/sections/AgentsSection"
import { KeybindingsPanel } from "@/features/workspace/configuration/sections/KeybindingsPanel"
import { NotificationsPanel } from "@/features/workspace/configuration/sections/NotificationsPanel"
import { WorkspaceSection } from "@/features/workspace/configuration/sections/WorkspaceSection"

type ConfigurationDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const sectionComponents: Record<ConfigSectionId, React.FC> = {
  workspace: WorkspaceSection,
  appearance: AppearanceSection,
  keybindings: KeybindingsPanel,
  notifications: NotificationsPanel,
  "ai-embeddings": AiEmbeddingsSection,
  agents: AgentsSection,
  "mcp-router": McpRouterSection,
  connectors: ConnectorsSection,
  memory: MemorySection,
  "local-paths": LocalPathsSection,
  "allowed-paths": AllowedPathsSection,
  maintenance: MaintenanceSection,
  telegram: TelegramIntegrationPanel,
}

export function ConfigurationDialog({ open, onOpenChange }: ConfigurationDialogProps) {
  const [activeSection, setActiveSection] = React.useState<ConfigSectionId>("workspace")

  const ActiveContent = sectionComponents[activeSection] || WorkspaceSection

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[min(90vh,820px)] w-[min(96vw,1080px)] max-w-6xl flex-col overflow-hidden rounded-3xl p-0 border border-border/80 bg-background shadow-2xl"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">Configuración</DialogTitle>
        <ConfigurationHeader />

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <ConfigurationSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
          <div className="flex-1 overflow-y-auto px-6 py-5 [scrollbar-width:thin]">
            <ActiveContent />
          </div>
        </div>

        <ConfigurationFooter
          onCancel={() => onOpenChange(false)}
          onSave={async () => {
            await new Promise((r) => setTimeout(r, 200))
            onOpenChange(false)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
