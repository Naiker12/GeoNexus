import * as React from "react"
import { useUiStore } from "@/stores/uiStore"
import { useKeybindingsStore } from "@/stores/keybindingsStore"
import { useAgentTaskStore } from "@/features/agent/store/useAgentTaskStore"
import { useSidebar } from "@/components/ui/sidebar"

type ShortcutHandlers = {
  onNewConversation?: () => void
  onSearchDocuments?: () => void
  onOpenSettings?: () => void
}

export function useGlobalShortcuts(handlers: ShortcutHandlers = {}) {
  const toggleCommandPalette = useUiStore((s) => s.toggleCommandPalette)
  const handleKeyEvent = useKeybindingsStore((s) => s.handleKeyEvent)
  const setAgentMode = useAgentTaskStore((s) => s.setMode)
  let toggleSidebar: (() => void) | undefined
  try {
    const sidebar = useSidebar()
    toggleSidebar = sidebar.toggleSidebar
  } catch {}

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const action = handleKeyEvent(e)
      if (!action) return

      switch (action) {
        case "command_palette":
          toggleCommandPalette()
          break
        case "toggle_sidebar":
          toggleSidebar?.()
          break
        case "new_conversation":
          handlers.onNewConversation?.()
          break
        case "search_documents":
          handlers.onSearchDocuments?.()
          break
        case "open_settings":
          handlers.onOpenSettings?.()
          break
        case "toggle_agent_mode":
          setAgentMode(useAgentTaskStore.getState().mode === "agent" ? "chat" : "agent")
          break
      }
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [handleKeyEvent, toggleCommandPalette, toggleSidebar, handlers, setAgentMode])
}
