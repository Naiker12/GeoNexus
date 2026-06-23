import { create } from "zustand"

interface UiStore {
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (open: boolean) => void
  toggleCommandPalette: () => void

  rightSidebarOpen: boolean
  setRightSidebarOpen: (open: boolean) => void
  toggleRightSidebar: () => void
}

export const useUiStore = create<UiStore>((set) => ({
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),

  rightSidebarOpen: false,
  setRightSidebarOpen: (open) => set({ rightSidebarOpen: open }),
  toggleRightSidebar: () => set((s) => ({ rightSidebarOpen: !s.rightSidebarOpen })),
}))
