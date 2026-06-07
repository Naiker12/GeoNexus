import * as React from "react"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { ConfigurationFooter } from "@/features/workspace/configuration/ConfigurationFooter"
import { ConfigurationHeader } from "@/features/workspace/configuration/ConfigurationHeader"
import { ConfigurationSidebar } from "@/features/workspace/configuration/ConfigurationSidebar"
import type { ConfigSectionId } from "@/features/workspace/configuration/configuration-types"
import { AiEmbeddingsSection } from "@/features/workspace/configuration/sections/AiEmbeddingsSection"
import { ConnectorsSection } from "@/features/workspace/configuration/sections/ConnectorsSection"
import { LocalPathsSection } from "@/features/workspace/configuration/sections/LocalPathsSection"
import { MaintenanceSection } from "@/features/workspace/configuration/sections/MaintenanceSection"
import { MapEnginesSection } from "@/features/workspace/configuration/sections/MapEnginesSection"
import { McpRouterSection } from "@/features/workspace/configuration/sections/McpRouterSection"
import { MemorySection } from "@/features/workspace/configuration/sections/MemorySection"

type ConfigurationDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const sectionComponents: Record<ConfigSectionId, React.FC> = {
  "ai-embeddings": AiEmbeddingsSection,
  "mcp-router": McpRouterSection,
  "map-engines": MapEnginesSection,
  connectors: ConnectorsSection,
  memory: MemorySection,
  "local-paths": LocalPathsSection,
  maintenance: MaintenanceSection,
}

export function ConfigurationDialog({
  open,
  onOpenChange,
}: ConfigurationDialogProps) {
  const [activeSection, setActiveSection] =
    React.useState<ConfigSectionId>("ai-embeddings")

  const ActiveContent = sectionComponents[activeSection]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(85vh,720px)] w-[min(96vw,960px)] flex-col overflow-hidden rounded-xl p-0">
        <ConfigurationHeader />

        <div className="flex min-h-0 flex-1">
          <ConfigurationSidebar
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <ActiveContent />
          </div>
        </div>

        <ConfigurationFooter onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
