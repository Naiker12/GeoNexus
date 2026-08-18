import { create } from "zustand"

interface UiStore {
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (open: boolean) => void
  toggleCommandPalette: () => void
}

export const useUiStore = create<UiStore>((set) => ({
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
}))
