import { useEffect } from "react"
import { ChatPanel } from "@/components/chat/ChatPanel"
import { AppTopbar } from "@/components/layout/AppTopbar"
import { CommandPalette } from "@/components/CommandPalette"
import { AnalysisPage } from "@/features/workspace/analysis/AnalysisPage"
import { ConfigurationDialog } from "@/features/workspace/configuration/ConfigurationDialog"
import { ConnectorsPage } from "@/features/workspace/connectors/ConnectorsPage"
import { DocumentsPage } from "@/features/workspace/documents/DocumentsPage"
import { GraphPage } from "@/features/workspace/graph/GraphPage"
import { AiContainersPage } from "@/features/workspace/AiContainersPage"
import { McpServersPage } from "@/features/workspace/mcp/McpServersPage"
import { SkillsPage } from "@/features/workspace/skills/SkillsPage"
import { AutomationPage } from "@/features/workspace/automation/AutomationPage"


type GeoAgentsWorkspaceProps = {
  activeRoute: string
  configOpen: boolean
  onConfigOpenChange: (open: boolean) => void
}

export function GeoAgentsWorkspace({ activeRoute, configOpen, onConfigOpenChange }: GeoAgentsWorkspaceProps) {
  useEffect(() => {
    const handleOpenRegister = () => {
      if (!activeRoute.startsWith("#mcp")) {
        window.location.hash = "#mcp"
      }
    }
    window.addEventListener("geonexus:open-mcp-register", handleOpenRegister)
    return () => window.removeEventListener("geonexus:open-mcp-register", handleOpenRegister)
  }, [activeRoute])

  useEffect(() => {
    const handleOpenSettings = () => {
      onConfigOpenChange(true)
    }
    window.addEventListener("geonexus:open-settings", handleOpenSettings)
    return () => window.removeEventListener("geonexus:open-settings", handleOpenSettings)
  }, [onConfigOpenChange])

  useEffect(() => {
    const handleOpenMap = () => {
      window.location.hash = "#memory"
    }
    window.addEventListener("geonexus:open-map", handleOpenMap)
    return () => window.removeEventListener("geonexus:open-map", handleOpenMap)
  }, [])

  const renderPage = () => {
    switch (true) {
      case activeRoute.startsWith("#chat"):
        return <ChatPanel />
      case activeRoute.startsWith("#tasks"):
        return <ChatPanel />
      case activeRoute.startsWith("#memory"):
        return <GraphPage />
      case activeRoute.startsWith("#files"):
        return <DocumentsPage />
      case activeRoute.startsWith("#mcp"):
        return <McpServersPage />
      case activeRoute.startsWith("#proveedores"):
        return <AiContainersPage />
      case activeRoute.startsWith("#uso"):
        return <AnalysisPage />
      case activeRoute.startsWith("#conectores"):
        return <ConnectorsPage />
      case activeRoute.startsWith("#projects"):
        return <ChatPanel />
      case activeRoute.startsWith("#skills"):
        return <SkillsPage />
      case activeRoute.startsWith("#automations"):
        return <AutomationPage />
      default:
        return <ChatPanel />
    }
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
      <AppTopbar />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <main className="relative flex-1 overflow-hidden bg-background flex flex-col">
          <MapBackdrop />
          {renderPage()}
        </main>
      </div>

      <CommandPalette />

      <ConfigurationDialog
        open={configOpen}
        onOpenChange={onConfigOpenChange}
      />
    </div>
  )
}

function MapBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <LightMapBackdrop />
      <DarkMapBackdrop />
    </div>
  )
}

function LightMapBackdrop() {
  return (
    <div className="absolute inset-0 block [.geo-dark_&]:hidden [.graphite_&]:hidden [.midnight_&]:hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:72px_72px]" />
      <svg
        className="absolute inset-0 size-full opacity-45"
        viewBox="0 0 1440 900"
        role="img"
        aria-label="Mapa base claro de referencia"
        preserveAspectRatio="xMidYMid slice"
      >
        <path
          d="M-80 690 C250 672 430 670 640 660 C870 650 1090 642 1520 650"
          fill="none"
          stroke="#bae6fd"
          strokeWidth="22"
          opacity=".30"
        />
        <path
          d="M-90 520 C210 478 390 462 585 430 C810 392 1040 365 1510 330"
          fill="none"
          stroke="#cbd5e1"
          strokeWidth="5"
          opacity=".12"
        />
        <path
          d="M-80 610 C250 575 510 560 745 532 C980 504 1210 488 1510 462"
          fill="none"
          stroke="#cbd5e1"
          strokeWidth="4"
          opacity=".10"
        />
      </svg>
      <div className="absolute inset-0 bg-background/58" />
    </div>
  )
}

function DarkMapBackdrop() {
  return (
    <div className="absolute inset-0 hidden [.geo-dark_&]:block [.graphite_&]:block [.midnight_&]:block">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.05)_1px,transparent_1px)] bg-[size:72px_72px]" />
      <svg
        className="absolute inset-0 size-full opacity-35"
        viewBox="0 0 1440 900"
        role="img"
        aria-label="Mapa base oscuro de referencia"
        preserveAspectRatio="xMidYMid slice"
      >
        <path
          d="M-80 690 C250 672 430 670 640 660 C870 650 1090 642 1520 650"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="24"
          opacity=".08"
        />
        <path
          d="M-90 520 C210 478 390 462 585 430 C810 392 1040 365 1510 330"
          fill="none"
          stroke="#94a3b8"
          strokeWidth="5"
          opacity=".06"
        />
        <path
          d="M-80 610 C250 575 510 560 745 532 C980 504 1210 488 1510 462"
          fill="none"
          stroke="#94a3b8"
          strokeWidth="4"
          opacity=".05"
        />
      </svg>
      <div className="absolute inset-0 bg-background/76" />
    </div>
  )
}