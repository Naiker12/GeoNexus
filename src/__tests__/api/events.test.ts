import { describe, expect, it, vi, beforeAll } from "vitest"

// Simula el runtime Tauri para que isTauriAvailable() retorne true
beforeAll(() => {
  vi.stubGlobal("window", { __TAURI_INTERNALS__: {} })
})

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}))

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(),
}))

import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import {
  listArtifacts,
  listArtifactSummaries,
  getArtifact,
  deleteArtifact,
  listEvents,
  countEvents,
  subscribeToBusEvent,
  subscribeToAllBusEvents,
} from "@/api/events"

describe("events API", () => {
  describe("listArtifacts", () => {
    it("calls invoke with correct args", async () => {
      vi.mocked(invoke).mockResolvedValueOnce([{ id: "a1", name: "test" }])
      const result = await listArtifacts("conv-1", 10, 0)
      expect(invoke).toHaveBeenCalledWith("list_artifacts", {
        conversationId: "conv-1", limit: 10, offset: 0,
      })
      expect(result).toHaveLength(1)
    })

    it("returns empty array fallback", async () => {
      vi.mocked(invoke).mockRejectedValueOnce(new Error("no tauri"))
      const result = await listArtifacts()
      expect(result).toEqual([])
    })
  })

  describe("listArtifactSummaries", () => {
    it("calls invoke with correct args", async () => {
      vi.mocked(invoke).mockResolvedValueOnce([{ id: "a1", name: "test" }])
      const result = await listArtifactSummaries("conv-1")
      expect(invoke).toHaveBeenCalledWith("list_artifact_summaries", {
        conversationId: "conv-1",
      })
      expect(result).toHaveLength(1)
    })
  })

  describe("getArtifact", () => {
    it("calls invoke with id", async () => {
      vi.mocked(invoke).mockResolvedValueOnce({ id: "a1", content: "abc" })
      const result = await getArtifact("a1")
      expect(invoke).toHaveBeenCalledWith("get_artifact", { id: "a1" })
      expect(result).not.toBeNull()
    })

    it("returns null fallback", async () => {
      vi.mocked(invoke).mockRejectedValueOnce(new Error("no tauri"))
      const result = await getArtifact("a1")
      expect(result).toBeNull()
    })
  })

  describe("deleteArtifact", () => {
    it("calls invoke with id", async () => {
      vi.mocked(invoke).mockResolvedValueOnce(true)
      const result = await deleteArtifact("a1")
      expect(invoke).toHaveBeenCalledWith("delete_artifact", { id: "a1" })
      expect(result).toBe(true)
    })
  })

  describe("listEvents", () => {
    it("calls invoke with filters", async () => {
      vi.mocked(invoke).mockResolvedValueOnce([{ id: "e1", domain: "chat" }])
      const result = await listEvents("chat", "conv-1", 20, 0)
      expect(invoke).toHaveBeenCalledWith("list_events", {
        domain: "chat", conversationId: "conv-1", limit: 20, offset: 0,
      })
      expect(result).toHaveLength(1)
    })
  })

  describe("countEvents", () => {
    it("calls invoke with domain", async () => {
      vi.mocked(invoke).mockResolvedValueOnce(5)
      const result = await countEvents("agent")
      expect(invoke).toHaveBeenCalledWith("count_events", {
        domain: "agent", conversationId: undefined,
      })
      expect(result).toBe(5)
    })
  })

  describe("subscribeToBusEvent", () => {
    it("subscribes to bus:domain:action event", async () => {
      const unlisten = vi.fn()
      vi.mocked(listen).mockResolvedValueOnce(unlisten)
      const callback = vi.fn()

      const result = await subscribeToBusEvent("chat", "message_sent", callback)
      expect(listen).toHaveBeenCalledWith("bus:chat:message_sent", expect.any(Function))
      expect(result).toBe(unlisten)
    })
  })

  describe("subscribeToAllBusEvents", () => {
    it("subscribes to bus:event", async () => {
      const unlisten = vi.fn()
      vi.mocked(listen).mockResolvedValueOnce(unlisten)
      const callback = vi.fn()

      const result = await subscribeToAllBusEvents(callback)
      expect(listen).toHaveBeenCalledWith("bus:event", expect.any(Function))
      expect(result).toBe(unlisten)
    })
  })
})
