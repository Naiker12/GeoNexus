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
  openArtifact,
  getArtifactContent,
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
      const result = await listArtifacts("conv-1")
      expect(invoke).toHaveBeenCalledWith("list_artifacts", {
        sessionId: "conv-1",
      })
      expect(result).toHaveLength(1)
    })

    it("returns empty array fallback", async () => {
      vi.mocked(invoke).mockRejectedValueOnce(new Error("no tauri"))
      const result = await listArtifacts("conv-1")
      expect(result).toEqual([])
    })
  })

  describe("openArtifact", () => {
    it("calls invoke with correct args", async () => {
      vi.mocked(invoke).mockResolvedValueOnce(undefined)
      await openArtifact("a1")
      expect(invoke).toHaveBeenCalledWith("open_artifact", {
        artifactId: "a1",
      })
    })
  })

  describe("getArtifactContent", () => {
    it("calls invoke with artifactId", async () => {
      vi.mocked(invoke).mockResolvedValueOnce("some-content")
      const result = await getArtifactContent("a1")
      expect(invoke).toHaveBeenCalledWith("get_artifact_content", { artifactId: "a1" })
      expect(result).toBe("some-content")
    })

    it("returns empty string fallback", async () => {
      vi.mocked(invoke).mockRejectedValueOnce(new Error("no tauri"))
      const result = await getArtifactContent("a1")
      expect(result).toBe("")
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
