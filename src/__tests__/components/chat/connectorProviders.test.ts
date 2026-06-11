import { describe, expect, it } from "vitest"
import { connectorProviders } from "@/features/workspace/connectors/connectors-data"

describe("connectorProviders", () => {
  it("has all required fields for every provider", () => {
    for (const p of connectorProviders) {
      expect(p.id).toBeTruthy()
      expect(p.name).toBeTruthy()
      expect(p.kind).toBeTruthy()
      expect(p.formats).toBeInstanceOf(Array)
      expect(p.formats.length).toBeGreaterThan(0)
      expect(p.permissions).toBeInstanceOf(Array)
      expect(p.permissions.length).toBeGreaterThan(0)
      expect(p.tools).toBeInstanceOf(Array)
      expect(p.tools.length).toBeGreaterThan(0)
      expect(p.indexTargets).toBeInstanceOf(Array)
      expect(p.indexTargets.length).toBeGreaterThan(0)
      expect(["V1", "V2", "V3"]).toContain(p.phase)
      expect(["simulated", "planned"]).toContain(p.status)
    }
  })

  it("has valid accent class format", () => {
    for (const p of connectorProviders) {
      expect(p.accent).toMatch(/^text-/)
    }
  })

  it("has at least one simulated connector", () => {
    const simulated = connectorProviders.filter((p) => p.status === "simulated")
    expect(simulated.length).toBeGreaterThanOrEqual(1)
  })

  it("every provider has a unique id", () => {
    const ids = connectorProviders.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("every svglRoute or fallbackIcon for online/active providers", () => {
    for (const p of connectorProviders) {
      if (p.status === "simulated") {
        expect(p.svglRoute || p.fallbackIcon).toBeTruthy()
      }
    }
  })

  it("ConnectCard lookup: connectorProviders.find works for known ids", () => {
    const knownIds = ["onedrive", "local", "qgis", "google-drive", "s3", "sharepoint", "dropbox", "arcgis-pro", "api-rest"]
    for (const id of knownIds) {
      const found = connectorProviders.find((p) => p.id === id)
      expect(found).toBeDefined()
      expect(found!.id).toBe(id)
    }
  })

  it("ConnectCard lookup: returns undefined for unknown id", () => {
    const found = connectorProviders.find((p) => p.id === ("nonexistent" as any))
    expect(found).toBeUndefined()
  })
})
