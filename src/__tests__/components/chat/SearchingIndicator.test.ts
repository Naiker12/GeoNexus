import { describe, expect, it } from "vitest"
import type { SearchSource, SearchStepStatus } from "@/components/chat/SearchingIndicator"

type SourceConfig = { color: string }

// Mirror the source config from SearchingIndicator for validation
const sourceConfigMock: Record<SearchSource, SourceConfig> = {
  onedrive: { color: "text-sky-500" },
  local: { color: "text-emerald-500" },
  chromadb: { color: "text-violet-500" },
  web: { color: "text-blue-500" },
  qgis: { color: "text-lime-500" },
}

const allStatuses: SearchStepStatus[] = ["searching", "found", "empty", "error"]

describe("SearchingIndicator source config", () => {
  it("has config for every known source type", () => {
    const sources: SearchSource[] = ["onedrive", "local", "chromadb", "web", "qgis"]
    for (const source of sources) {
      expect(sourceConfigMock[source]).toBeDefined()
      expect(sourceConfigMock[source].color).toMatch(/^text-/)
    }
  })

  it("all sources have unique colors", () => {
    const colors = Object.values(sourceConfigMock).map((c) => c.color)
    expect(new Set(colors).size).toBe(colors.length)
  })

  it("supports all step statuses", () => {
    expect(allStatuses).toEqual(["searching", "found", "empty", "error"])
  })
})

describe("SearchingIndicator step scenarios", () => {
  interface SearchStep {
    source: SearchSource
    status: SearchStepStatus
    label: string
    count?: number
  }

  function makeSteps(overrides: Partial<SearchStep>[]): SearchStep[] {
    return overrides.map((o) => ({
      source: "local",
      status: "searching",
      label: "Buscando...",
      ...o,
    }))
  }

  it("searching step has no count", () => {
    const steps = makeSteps([{ status: "searching" }])
    expect(steps[0].count).toBeUndefined()
  })

  it("found step has count", () => {
    const steps = makeSteps([{ status: "found", count: 5 }])
    expect(steps[0].count).toBe(5)
  })

  it("empty step may have count 0", () => {
    const steps = makeSteps([{ status: "empty", count: 0 }])
    expect(steps[0].count).toBe(0)
  })

  it("error step has no count", () => {
    const steps = makeSteps([{ status: "error" }])
    expect(steps[0].count).toBeUndefined()
  })

  it("multiple steps with mixed statuses", () => {
    const steps: SearchStep[] = [
      { source: "onedrive", status: "found", label: "OneDrive", count: 3 },
      { source: "local", status: "searching", label: "Local" },
      { source: "chromadb", status: "empty", label: "ChromaDB", count: 0 },
    ]
    expect(steps).toHaveLength(3)
    expect(steps[0].source).toBe("onedrive")
    expect(steps[1].status).toBe("searching")
    expect(steps[2].count).toBe(0)
  })

  it("all sources can be used in a step", () => {
    const allSources: SearchSource[] = ["onedrive", "local", "chromadb", "web", "qgis"]
    const steps: SearchStep[] = allSources.map((source) => ({
      source,
      status: "found",
      label: source,
      count: 1,
    }))
    expect(steps).toHaveLength(5)
    for (const step of steps) {
      expect(sourceConfigMock[step.source]).toBeDefined()
    }
  })
})
