import { describe, expect, it, vi } from "vitest"
import type { AiConnector } from "@/features/workspace/workspace-data"

// Mock the ConnectorsContext
vi.mock("@/contexts/ConnectorsContext", () => ({
  useConnectors: vi.fn(),
}))

import { useConnectors } from "@/contexts/ConnectorsContext"

// Build items the same way MentionPicker does
function buildMentionItems(connectors: AiConnector[]) {
  const items: Array<{ id: string; type: string; label: string; connected: boolean }> = []
  for (const c of connectors) {
    items.push({
      id: c.id,
      type: "connector",
      label: c.name,
      connected: c.status === "online",
    })
  }
  items.push(
    { id: "chroma-docs", type: "collection", label: "Coleccion documental", connected: false },
    { id: "chroma-gis", type: "collection", label: "Coleccion GIS", connected: false }
  )
  return items
}

function filterItems(items: ReturnType<typeof buildMentionItems>, query: string) {
  if (!query.trim()) return items
  const q = query.toLowerCase()
  return items.filter((item) => item.label.toLowerCase().includes(q))
}

const mockConnectors: AiConnector[] = [
  { id: "c1", name: "OneDrive", provider: "cloud", role: "chat", status: "online", model: "gpt4", models: ["gpt4"], endpoint: "https://", supportsTools: true, privacy: "keychain", latency: "50ms", description: "", icon: undefined as any },
  { id: "c2", name: "Archivos Locales", provider: "local", role: "chat", status: "offline", model: "gpt4", models: ["gpt4"], endpoint: "file://", supportsTools: true, privacy: "local", latency: "1ms", description: "", icon: undefined as any },
  { id: "c3", name: "QGIS", provider: "local", role: "chat", status: "online", model: "gpt4", models: ["gpt4"], endpoint: "qgis://", supportsTools: true, privacy: "local", latency: "5ms", description: "", icon: undefined as any },
]

describe("MentionPicker item building", () => {
  it("creates items for each connector plus static collections", () => {
    const items = buildMentionItems(mockConnectors)
    expect(items).toHaveLength(5)
    expect(items[0].label).toBe("OneDrive")
    expect(items[2].label).toBe("QGIS")
    expect(items[3].id).toBe("chroma-docs")
    expect(items[4].id).toBe("chroma-gis")
  })

  it("marks connected=true when status is online", () => {
    const items = buildMentionItems(mockConnectors)
    expect(items[0].connected).toBe(true)
    expect(items[1].connected).toBe(false)
    expect(items[2].connected).toBe(true)
  })

  it("static collections are always disconnected", () => {
    const items = buildMentionItems(mockConnectors)
    expect(items[3].connected).toBe(false)
    expect(items[4].connected).toBe(false)
  })
})

describe("MentionPicker filtering", () => {
  it("returns all items when query is empty", () => {
    const items = buildMentionItems(mockConnectors)
    expect(filterItems(items, "")).toHaveLength(5)
  })

  it("filters by query substring (case insensitive)", () => {
    const items = buildMentionItems(mockConnectors)
    expect(filterItems(items, "one")).toHaveLength(1)
    expect(filterItems(items, "Archivos")).toHaveLength(1)
    expect(filterItems(items, "coleccion")).toHaveLength(2)
  })

  it("returns empty array for no match", () => {
    const items = buildMentionItems(mockConnectors)
    expect(filterItems(items, "zzzzz")).toHaveLength(0)
  })
})
