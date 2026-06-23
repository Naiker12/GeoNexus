import * as React from "react"
import { XIcon } from "lucide-react"
import { useUiStore } from "@/stores/uiStore"
import { TerminalPanel } from "@/components/terminal/TerminalPanel"

export function RightSidebar() {
  const rightSidebarOpen = useUiStore((s) => s.rightSidebarOpen)
  const setRightSidebarOpen = useUiStore((s) => s.setRightSidebarOpen)

  if (!rightSidebarOpen) return null

  return (
    <div className="flex w-[400px] flex-col border-l border-border bg-background shrink-0">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="text-xs font-medium text-muted-foreground">Terminal</span>
        <button
          type="button"
          onClick={() => setRightSidebarOpen(false)}
          className="flex size-5 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <XIcon className="size-3.5" />
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <TerminalPanel />
      </div>
    </div>
  )
}
