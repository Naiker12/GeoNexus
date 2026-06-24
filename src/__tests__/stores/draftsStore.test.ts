import { describe, expect, it, beforeEach } from "vitest"
import { useDraftsStore } from "@/stores/draftsStore"

describe("draftsStore", () => {
  beforeEach(() => {
    localStorage.clear()
    useDraftsStore.setState({ drafts: {} })
  })

  it("stores and retrieves a draft by conversationId", () => {
    useDraftsStore.getState().setDraft("conv-1", "hello world")
    expect(useDraftsStore.getState().getDraft("conv-1")).toBe("hello world")
  })

  it("returns empty string for unknown conversationId", () => {
    expect(useDraftsStore.getState().getDraft("nonexistent")).toBe("")
  })

  it("overwrites an existing draft", () => {
    useDraftsStore.getState().setDraft("conv-1", "first draft")
    useDraftsStore.getState().setDraft("conv-1", "second draft")
    expect(useDraftsStore.getState().getDraft("conv-1")).toBe("second draft")
  })

  it("clears a draft", () => {
    useDraftsStore.getState().setDraft("conv-1", "to be removed")
    useDraftsStore.getState().clearDraft("conv-1")
    expect(useDraftsStore.getState().getDraft("conv-1")).toBe("")
  })

  it("does not affect other drafts when clearing one", () => {
    useDraftsStore.getState().setDraft("conv-1", "first")
    useDraftsStore.getState().setDraft("conv-2", "second")
    useDraftsStore.getState().clearDraft("conv-1")
    expect(useDraftsStore.getState().getDraft("conv-2")).toBe("second")
  })

  it("persists drafts to localStorage", () => {
    useDraftsStore.getState().setDraft("conv-3", "persisted text")
    const raw = localStorage.getItem("geonexus:composer-drafts")
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!)
    expect(parsed["conv-3"]).toBe("persisted text")
  })
})
