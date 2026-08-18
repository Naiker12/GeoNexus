import { ModelHeaderPopover } from "@/components/chat/ModelHeaderPopover"
import { LoadedModelsIndicator } from "@/components/loaded-models/LoadedModelsIndicator"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useUiStore } from "@/stores/uiStore"
import { KeyboardIcon } from "lucide-react"

export function AppTopbar() {
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen)

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border/70 bg-background/95 px-4 backdrop-blur-md">
      {/* Left: Model Selector Pill & VRAM Tracker */}
      <div className="flex items-center gap-2.5">
        <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
        <Separator orientation="vertical" className="h-4" />
        <ModelHeaderPopover />
        <LoadedModelsIndicator />
      </div>

      {/* Right: Context Tracker & Quick Controls */}
      <div className="flex items-center gap-3 text-xs">
        {/* Context usage badge (e.g. 34.2k / 356.4k) */}
        <div className="hidden sm:flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-[11px] text-muted-foreground font-mono">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>34.2k / 128.0k</span>
          <div className="w-12 h-1 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full w-[26%]" />
          </div>
        </div>

        {/* Command Palette Button */}
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          title="Comandos (Ctrl+K)"
        >
          <KeyboardIcon className="size-3.5" />
        </button>
      </div>
    </header>
  )
}
