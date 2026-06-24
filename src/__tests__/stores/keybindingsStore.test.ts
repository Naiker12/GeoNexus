import { describe, expect, it, beforeEach } from "vitest"
import { useKeybindingsStore } from "@/stores/keybindingsStore"

describe("keybindingsStore", () => {
  beforeEach(() => {
    localStorage.clear()
    useKeybindingsStore.setState({ bindings: [
      { action: "command_palette", label: "Paleta de comandos", defaultKeys: "CmdOrCtrl+K", currentKeys: "CmdOrCtrl+K", category: "General" },
      { action: "new_conversation", label: "Nueva conversación", defaultKeys: "CmdOrCtrl+N", currentKeys: "CmdOrCtrl+N", category: "Chat" },
      { action: "toggle_sidebar", label: "Alternar barra lateral", defaultKeys: "CmdOrCtrl+B", currentKeys: "CmdOrCtrl+B", category: "General" },
      { action: "send_message", label: "Enviar mensaje", defaultKeys: "Enter", currentKeys: "Enter", category: "Chat" },
    ]})
  })

  it("returns default keys for an action", () => {
    const keys = useKeybindingsStore.getState().getKeys("command_palette")
    expect(keys).toBe("CmdOrCtrl+K")
  })

  it("sets custom keys for an action", () => {
    useKeybindingsStore.getState().setKeys("command_palette", "Alt+Space")
    expect(useKeybindingsStore.getState().getKeys("command_palette")).toBe("Alt+Space")
  })

  it("resets a single keybinding to default", () => {
    useKeybindingsStore.getState().setKeys("command_palette", "Alt+Space")
    useKeybindingsStore.getState().resetKeybinding("command_palette")
    expect(useKeybindingsStore.getState().getKeys("command_palette")).toBe("CmdOrCtrl+K")
  })

  it("resets all keybindings to defaults", () => {
    useKeybindingsStore.getState().setKeys("command_palette", "Alt+Space")
    useKeybindingsStore.getState().setKeys("new_conversation", "Ctrl+Shift+N")
    useKeybindingsStore.getState().resetDefaults()
    expect(useKeybindingsStore.getState().getKeys("command_palette")).toBe("CmdOrCtrl+K")
    expect(useKeybindingsStore.getState().getKeys("new_conversation")).toBe("CmdOrCtrl+N")
  })

  it("detects matching keyboard event", () => {
    const e = new KeyboardEvent("keydown", { key: "k", ctrlKey: true, metaKey: false })
    const action = useKeybindingsStore.getState().handleKeyEvent(e)
    expect(action).toBe("command_palette")
  })

  it("returns null for non-matching keyboard event", () => {
    const e = new KeyboardEvent("keydown", { key: "z", ctrlKey: true })
    const action = useKeybindingsStore.getState().handleKeyEvent(e)
    expect(action).toBeNull()
  })

  it("persists custom bindings to localStorage", () => {
    useKeybindingsStore.getState().setKeys("toggle_sidebar", "Ctrl+Shift+B")
    const raw = localStorage.getItem("geonexus:keybindings")
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!)
    const sidebarBinding = parsed.find((b: { action: string }) => b.action === "toggle_sidebar")
    expect(sidebarBinding.currentKeys).toBe("Ctrl+Shift+B")
  })
})
