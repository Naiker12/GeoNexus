import { describe, expect, it } from "vitest"
import { buildSummary, type ThinkingStep } from "@/components/chat/ThinkingInline"

function step(label: string, status: "done" | "active" | "pending"): ThinkingStep {
  return { id: label, label, icon: null as unknown as React.ReactNode, status }
}

describe("buildSummary", () => {
  it("shows active step label when a step is active", () => {
    const steps = [step("Analizando", "done"), step("Buscando", "active"), step("Generando", "pending")]
    expect(buildSummary(steps)).toBe("Buscando")
  })

  it("includes elapsed seconds when active step has elapsed", () => {
    const steps = [step("Analizando", "done"), step("Buscando", "active"), step("Generando", "pending")]
    expect(buildSummary(steps, 3.5)).toBe("Buscando · 3.5s")
  })

  it("shows completion message when all steps done", () => {
    const steps = [step("Analizando", "done"), step("Buscando", "done"), step("Generando", "done")]
    expect(buildSummary(steps)).toBe("Razonamiento completado")
  })

  it("includes elapsed time on completion", () => {
    const steps = [step("Analizando", "done"), step("Generando", "done")]
    expect(buildSummary(steps, 12.345)).toBe("Razonamiento completado · 12.3s")
  })

  it("shows count when no active steps but not all done", () => {
    const steps = [step("Analizando", "done"), step("Buscando", "pending"), step("Generando", "pending")]
    expect(buildSummary(steps)).toBe("1 de 3 pasos completados")
  })

  it("shows zero count when no steps done", () => {
    const steps = [step("Analizando", "pending"), step("Buscando", "pending")]
    expect(buildSummary(steps)).toBe("0 de 2 pasos completados")
  })

  it("handles empty steps array (vacuous all-done)", () => {
    expect(buildSummary([])).toBe("Razonamiento completado")
  })

  it("prefers active over anything else", () => {
    const steps = [step("Analizando", "done"), step("Buscando", "active"), step("Generando", "done")]
    expect(buildSummary(steps)).toBe("Buscando")
  })
})
