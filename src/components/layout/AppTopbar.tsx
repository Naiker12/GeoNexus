import { KeyboardIcon, TerminalSquare } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ModelHeaderPopover } from "@/components/chat/ModelHeaderPopover"
import { useUiStore } from "@/stores/uiStore"
import { cn } from "@/lib/utils"

export function AppTopbar() {
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen)
  const rightSidebarOpen = useUiStore((s) => s.rightSidebarOpen)
  const toggleRightSidebar = useUiStore((s) => s.toggleRightSidebar)

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="hidden data-[orientation=vertical]:h-4 sm:block"
      />

      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          title="Comandos (Ctrl+K)"
        >
          <KeyboardIcon className="size-3.5" />
        </button>

        <button
          type="button"
          onClick={() => toggleRightSidebar()}
          className={cn(
            "flex size-7 items-center justify-center rounded-md transition-colors",
            rightSidebarOpen
              ? "text-primary bg-primary/10"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
          )}
          title="Terminal (Ctrl+`)"
        >
          <TerminalSquare className="size-3.5" />
        </button>

        <ModelHeaderPopover />
      </div>
    </header>
  )
}
