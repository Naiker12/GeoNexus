import { describe, expect, it, vi, beforeAll } from "vitest"

beforeAll(() => {
  vi.stubGlobal("window", { __TAURI_INTERNALS__: {} })
})

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}))

import { invoke } from "@tauri-apps/api/core"
import { setSecure, getSecure, deleteSecure } from "@/api/secure"

describe("secure API", () => {
  describe("setSecure", () => {
    it("calls invoke with key and value", async () => {
      vi.mocked(invoke).mockResolvedValueOnce(undefined)
      await setSecure("api-key-openai", "sk-...")
      expect(invoke).toHaveBeenCalledWith("set_secure", {
        key: "api-key-openai", value: "sk-...",
      })
    })

    it("handles fallback gracefully", async () => {
      vi.mocked(invoke).mockRejectedValueOnce(new Error("no tauri"))
      await expect(setSecure("test", "val")).resolves.toBeUndefined()
    })
  })

  describe("getSecure", () => {
    it("returns value from invoke", async () => {
      vi.mocked(invoke).mockResolvedValueOnce("sk-...")
      const result = await getSecure("api-key-openai")
      expect(invoke).toHaveBeenCalledWith("get_secure", { key: "api-key-openai" })
      expect(result).toBe("sk-...")
    })

    it("returns null fallback", async () => {
      vi.mocked(invoke).mockRejectedValueOnce(new Error("no tauri"))
      const result = await getSecure("missing-key")
      expect(result).toBeNull()
    })
  })

  describe("deleteSecure", () => {
    it("calls invoke with key", async () => {
      vi.mocked(invoke).mockResolvedValueOnce(undefined)
      await deleteSecure("api-key-openai")
      expect(invoke).toHaveBeenCalledWith("delete_secure", { key: "api-key-openai" })
    })
  })
})
