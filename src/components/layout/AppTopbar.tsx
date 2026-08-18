import { ModelHeaderPopover } from "@/components/chat/ModelHeaderPopover"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useLanguage } from "@/i18n/useLanguage"
import { useUiStore } from "@/stores/uiStore"
import { Activity01Icon, RefreshIcon, SidebarRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

export function AppTopbar() {
  const { t } = useLanguage()
  const _setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen)

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border/70 bg-background/95 px-4 backdrop-blur-md select-none">
      {/* Left: Model Selector Pill */}
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
        <Separator orientation="vertical" className="h-4" />
        <ModelHeaderPopover />
      </div>

      {/* Right: Telemetry Link & Action Icons */}
      <div className="flex items-center gap-3 text-xs">
        {/* Link directo a Telemetría & Monitor */}
        <a
          href="#monitor"
          className="hidden sm:flex items-center gap-2 rounded-full border border-border/70 bg-muted/40 hover:bg-muted px-2.5 py-1 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
          title="Ver Monitor de VRAM & Telemetría"
        >
          <HugeiconsIcon
            icon={Activity01Icon}
            strokeWidth={1.75}
            className="size-3.5 text-emerald-500"
          />
          <span>{t.topbar.vramTelemetry}</span>
        </a>

        {/* Sync / Refresh Button */}
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
          title={t.topbar.reloadState}
        >
          <HugeiconsIcon icon={RefreshIcon} strokeWidth={1.75} className="size-4" />
        </button>

        {/* Layout / Side panel toggle */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("geonexus:toggle-side-panel"))}
          className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
          title={t.topbar.toggleSidePanel}
        >
          <HugeiconsIcon icon={SidebarRight01Icon} strokeWidth={1.75} className="size-4" />
        </button>
      </div>
    </header>
  )
}
