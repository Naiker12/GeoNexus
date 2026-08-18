import { configGroups } from "@/features/workspace/configuration/configuration-data"
import type { ConfigSectionId } from "@/features/workspace/configuration/configuration-types"
import { useLanguage } from "@/i18n/useLanguage"
import { cn } from "@/lib/utils"

type ConfigurationSidebarProps = {
  activeSection: ConfigSectionId
  onSectionChange: (section: ConfigSectionId) => void
}

export function ConfigurationSidebar({
  activeSection,
  onSectionChange,
}: ConfigurationSidebarProps) {
  const { t, language } = useLanguage()

  const getSectionLabel = (id: ConfigSectionId, defaultLabel: string) => {
    if (language === "es") return defaultLabel
    const enMap: Record<string, string> = {
      workspace: "Workspace & Environment",
      appearance: "Themes & Appearance",
      keybindings: "Keyboard Shortcuts",
      notifications: "Notifications",
      "ai-embeddings": "Providers & AI",
      agents: "Agents & Permissions",
      "mcp-router": "MCP Protocol",
      connectors: "Connectors",
      memory: "Memory & RAG Graph",
      "local-paths": "Local Paths",
      "allowed-paths": "Allowed Directories",
      maintenance: "Maintenance",
    }
    return enMap[id] || defaultLabel
  }

  const getGroupLabel = (groupLabel: string) => {
    if (language === "es") return groupLabel
    const enMap: Record<string, string> = {
      GENERAL: "GENERAL",
      "MODELOS E IA": "AI & MODELS",
      "CONEXIONES Y DATOS": "CONNECTIONS & DATA",
    }
    return enMap[groupLabel] || groupLabel
  }

  return (
    <nav className="flex w-64 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border/70 bg-muted/20 px-3 py-3 select-none [scrollbar-width:thin]">
      {configGroups.map((group, groupIdx) => (
        <div key={`${group.label}-${groupIdx}`} className="mb-2">
          <p className="mb-1 px-2.5 pt-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 font-mono">
            {getGroupLabel(group.label)}
          </p>
          <div className="space-y-0.5">
            {group.sections.map((section) => {
              const isActive = activeSection === section.id
              const Icon = section.icon
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => onSectionChange(section.id)}
                  className={cn(
                    "group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs font-medium transition-all cursor-pointer",
                    isActive
                      ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0 transition-colors",
                      isActive
                        ? "text-primary-foreground"
                        : "text-muted-foreground/80 group-hover:text-foreground"
                    )}
                  />
                  <span className="min-w-0 truncate">{getSectionLabel(section.id, section.label)}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}
