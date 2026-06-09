import { describe, expect, it, vi } from "vitest"

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}))

import { invoke } from "@tauri-apps/api/core"
import { getProjectContext, recallChunks } from "@/api/chat"

describe("chat API", () => {
  describe("getProjectContext", () => {
    it("calls invoke with correct args", async () => {
      vi.mocked(invoke).mockResolvedValueOnce({
        assets: [],
        graph_nodes: [],
      })

      const result = await getProjectContext("proj-1")
      expect(invoke).toHaveBeenCalledWith("get_project_context", {
        projectId: "proj-1",
      })
      expect(result.assets).toEqual([])
    })

    it("throws on empty projectId", () => {
      expect(() => getProjectContext("")).toThrow("project_id")
    })
  })

  describe("recallChunks", () => {
    it("calls invoke with correct args", async () => {
      vi.mocked(invoke).mockResolvedValueOnce([{ text: "chunk", source: "doc", asset_id: "a1", score: 0.9 }])

      const result = await recallChunks("proj-1", "query test")
      expect(invoke).toHaveBeenCalledWith("recall_chunks", {
        input: { project_id: "proj-1", query: "query test", top_k: 4 },
      })
      expect(result[0].text).toBe("chunk")
    })
  })
})
