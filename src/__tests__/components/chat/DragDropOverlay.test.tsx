import { describe, expect, it, vi, afterEach } from "vitest"

afterEach(() => {
  document.body.innerHTML = ""
  vi.restoreAllMocks()
})

// Test the geonexus:global-drop-files custom event contract
describe("global drag&drop event contract", () => {
  it("dispatches geonexus:global-drop-files with files on drop", () => {
    const handler = vi.fn()
    window.addEventListener("geonexus:global-drop-files", handler)

    const file = new File(["test"], "test.txt", { type: "text/plain" })
    window.dispatchEvent(
      new CustomEvent("geonexus:global-drop-files", { detail: [file] })
    )

    expect(handler).toHaveBeenCalled()
    const event = handler.mock.calls[0][0] as CustomEvent
    expect(event.detail).toHaveLength(1)
    expect(event.detail[0].name).toBe("test.txt")
    window.removeEventListener("geonexus:global-drop-files", handler)
  })

  it("supports multiple files in the custom event", () => {
    const handler = vi.fn()
    window.addEventListener("geonexus:global-drop-files", handler)

    const files = [
      new File(["a"], "a.txt", { type: "text/plain" }),
      new File(["b"], "b.txt", { type: "text/plain" }),
    ]
    window.dispatchEvent(new CustomEvent("geonexus:global-drop-files", { detail: files }))

    expect(handler).toHaveBeenCalled()
    const event = handler.mock.calls[0][0] as CustomEvent
    expect(event.detail).toHaveLength(2)
    window.removeEventListener("geonexus:global-drop-files", handler)
  })
})
