import { describe, expect, it } from "vitest"
import { DEFAULT_THINKING_STEPS } from "@/components/chat/ThinkingInline"

describe("DEFAULT_THINKING_STEPS", () => {
  it("has all required fields", () => {
    for (const step of DEFAULT_THINKING_STEPS) {
      expect(step.id).toBeTruthy()
      expect(step.label).toBeTruthy()
      expect(step.icon).toBeTruthy()
      expect(step.status).toBe("pending")
    }
  })

  it("has 4 steps in order", () => {
    expect(DEFAULT_THINKING_STEPS).toHaveLength(4)
    expect(DEFAULT_THINKING_STEPS[0].id).toBe("parse")
    expect(DEFAULT_THINKING_STEPS[1].id).toBe("docs")
    expect(DEFAULT_THINKING_STEPS[2].id).toBe("kb")
    expect(DEFAULT_THINKING_STEPS[3].id).toBe("gen")
  })

  it("all IDs are unique", () => {
    const ids = DEFAULT_THINKING_STEPS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("all labels start with non-empty strings", () => {
    for (const step of DEFAULT_THINKING_STEPS) {
      expect(step.label.length).toBeGreaterThan(0)
    }
  })
})
