import { create } from "zustand"

type DraftsStore = {
  drafts: Record<string, string>
  setDraft: (conversationId: string, text: string) => void
  getDraft: (conversationId: string) => string
  clearDraft: (conversationId: string) => void
}

const STORAGE_KEY = "geonexus:composer-drafts"

function loadDrafts(): Record<string, string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (typeof parsed === "object" && parsed !== null) {
        return parsed
      }
    }
  } catch {}
  return {}
}

function saveDrafts(drafts: Record<string, string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts))
  } catch {}
}

export const useDraftsStore = create<DraftsStore>((set, get) => ({
  drafts: loadDrafts(),

  setDraft: (conversationId, text) => {
    const next = { ...get().drafts, [conversationId]: text }
    set({ drafts: next })
    saveDrafts(next)
  },

  getDraft: (conversationId) => {
    return get().drafts[conversationId] ?? ""
  },

  clearDraft: (conversationId) => {
    const next = { ...get().drafts }
    delete next[conversationId]
    set({ drafts: next })
    saveDrafts(next)
  },
}))
