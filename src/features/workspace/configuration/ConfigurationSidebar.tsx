import { cn } from "@/lib/utils"
import { configGroups } from "@/features/workspace/configuration/configuration-data"
import type { ConfigSectionId } from "@/features/workspace/configuration/configuration-types"

type ConfigurationSidebarProps = {
  activeSection: ConfigSectionId
  onSectionChange: (section: ConfigSectionId) => void
}

export function ConfigurationSidebar({
  activeSection,
  onSectionChange,
}: ConfigurationSidebarProps) {
  return (
    <nav className="flex w-52 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border px-3 py-3">
      {configGroups.map((group, groupIdx) => (
        <div key={`${group.label}-${groupIdx}`} className="mb-1">
          <p className="mb-1 px-2 pt-2 text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground/70">
            {group.label}
          </p>
          {group.sections.map((section) => {
            const isActive = activeSection === section.id
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => onSectionChange(section.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <section.icon className="size-4 shrink-0" />
                <span className="min-w-0 truncate">{section.label}</span>
                {section.indicator && (
                  <span
                    className={cn(
                      "ml-auto size-2 shrink-0 rounded-full",
                      section.indicator === "green" && "bg-emerald-500",
                      section.indicator === "yellow" && "bg-amber-400"
                    )}
                  />
                )}
              </button>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
