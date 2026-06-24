import { create } from "zustand"

export type KeybindingAction =
  | "command_palette"
  | "new_conversation"
  | "toggle_sidebar"
  | "send_message"
  | "search_documents"
  | "toggle_web_search"
  | "toggle_agent_mode"
  | "open_settings"

export type Keybinding = {
  action: KeybindingAction
  label: string
  defaultKeys: string
  currentKeys: string
  category: string
}

type KeybindingsStore = {
  bindings: Keybinding[]
  getKeys: (action: KeybindingAction) => string
  setKeys: (action: KeybindingAction, keys: string) => void
  resetKeybinding: (action: KeybindingAction) => void
  resetDefaults: () => void
  handleKeyEvent: (e: KeyboardEvent) => KeybindingAction | null
}

const STORAGE_KEY = "geonexus:keybindings"

const DEFAULT_BINDINGS: Keybinding[] = [
  { action: "command_palette", label: "Paleta de comandos", defaultKeys: "CmdOrCtrl+K", currentKeys: "CmdOrCtrl+K", category: "General" },
  { action: "new_conversation", label: "Nueva conversación", defaultKeys: "CmdOrCtrl+N", currentKeys: "CmdOrCtrl+N", category: "Chat" },
  { action: "toggle_sidebar", label: "Alternar barra lateral", defaultKeys: "CmdOrCtrl+B", currentKeys: "CmdOrCtrl+B", category: "General" },
  { action: "send_message", label: "Enviar mensaje", defaultKeys: "Enter", currentKeys: "Enter", category: "Chat" },
  { action: "search_documents", label: "Buscar documentos", defaultKeys: "CmdOrCtrl+Shift+F", currentKeys: "CmdOrCtrl+Shift+F", category: "Workspace" },
  { action: "toggle_web_search", label: "Búsqueda web", defaultKeys: "CmdOrCtrl+Shift+W", currentKeys: "CmdOrCtrl+Shift+W", category: "Chat" },
  { action: "toggle_agent_mode", label: "Modo agente", defaultKeys: "CmdOrCtrl+Shift+A", currentKeys: "CmdOrCtrl+Shift+A", category: "Chat" },
  { action: "open_settings", label: "Configuración", defaultKeys: "CmdOrCtrl+Shift+P", currentKeys: "CmdOrCtrl+Shift+P", category: "General" },
]

function loadBindings(): Keybinding[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as Keybinding[]
      return DEFAULT_BINDINGS.map((def) => {
        const saved = parsed.find((p) => p.action === def.action)
        return saved ? { ...def, currentKeys: saved.currentKeys } : def
      })
    }
  } catch {}
  return [...DEFAULT_BINDINGS]
}

function saveBindings(bindings: Keybinding[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings))
  } catch {}
}

function normalizeKeys(e: KeyboardEvent): string {
  const parts: string[] = []
  if (e.metaKey) parts.push("CmdOrCtrl")
  else if (e.ctrlKey) parts.push("CmdOrCtrl")
  if (e.shiftKey) parts.push("Shift")
  if (e.altKey) parts.push("Alt")
  const key = e.key === "Meta" || e.key === "Control" || e.key === "Shift" || e.key === "Alt" ? "" : e.key
  if (key) {
    parts.push(key.length === 1 ? key.toUpperCase() : key)
  }
  return parts.join("+")
}

export const useKeybindingsStore = create<KeybindingsStore>((set, get) => ({
  bindings: loadBindings(),

  getKeys: (action) => {
    const b = get().bindings.find((b) => b.action === action)
    return b?.currentKeys ?? ""
  },

  setKeys: (action, keys) => {
    set((state) => {
      const next = state.bindings.map((b) =>
        b.action === action ? { ...b, currentKeys: keys } : b
      )
      saveBindings(next)
      return { bindings: next }
    })
  },

  resetKeybinding: (action) => {
    const def = DEFAULT_BINDINGS.find((b) => b.action === action)
    if (!def) return
    set((state) => {
      const next = state.bindings.map((b) =>
        b.action === action ? { ...b, currentKeys: def.currentKeys } : b
      )
      saveBindings(next)
      return { bindings: next }
    })
  },

  resetDefaults: () => {
    set({ bindings: [...DEFAULT_BINDINGS] })
    saveBindings(DEFAULT_BINDINGS)
  },

  handleKeyEvent: (e) => {
    const normalized = normalizeKeys(e)
    for (const b of get().bindings) {
      if (b.currentKeys === normalized) {
        e.preventDefault()
        e.stopPropagation()
        return b.action
      }
    }
    return null
  },
}))
