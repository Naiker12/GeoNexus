import * as React from "react"
import { configGroups } from "@/features/workspace/configuration/configuration-data"
import type { ConfigSectionId } from "@/features/workspace/configuration/configuration-types"
import { cn } from "@/lib/utils"

type ConfigurationSidebarProps = {
  activeSection: ConfigSectionId
  onSectionChange: (section: ConfigSectionId) => void
}

export function ConfigurationSidebar({
  activeSection,
  onSectionChange,
}: ConfigurationSidebarProps) {
  return (
    <nav className="flex w-64 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border/70 bg-muted/20 px-3 py-3 select-none [scrollbar-width:thin]">
      {configGroups.map((group, groupIdx) => (
        <div key={`${group.label}-${groupIdx}`} className="mb-2">
          <p className="mb-1 px-2.5 pt-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 font-mono">
            {group.label}
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
                    "group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs font-medium transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0 transition-colors",
                      isActive ? "text-primary-foreground" : "text-muted-foreground/80 group-hover:text-foreground"
                    )}
                  />
                  <span className="min-w-0 truncate">{section.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}
