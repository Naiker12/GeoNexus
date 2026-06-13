import { describe, expect, it } from "vitest"
import { getContextualSteps, computeStepStates } from "@/components/chat/contextualSteps"
import type { ChatLoadingPhase } from "@/components/chat/ChatLoadingIndicator"

describe("computeStepStates", () => {
  const steps = getContextualSteps("hola mundo")

  it("all pending when phase is idle", () => {
    const states = computeStepStates(steps, "idle")
    expect(states.every((s) => s === "done")).toBe(true)
  })

  it("first step active during classifying", () => {
    const states = computeStepStates(steps, "classifying")
    expect(states.filter((s) => s === "active")).toHaveLength(1)
    expect(states[0]).toBe("active")
  })

  it("searching phase: classifying done, last searching step active", () => {
    const states = computeStepStates(steps, "searching")
    expect(states[0]).toBe("done")
    let lastSearchIdx = -1
    for (let i = 0; i < steps.length; i++) {
      if (steps[i].phase === "searching") lastSearchIdx = i
    }
    for (let i = 0; i < lastSearchIdx; i++) {
      if (steps[i].phase === "searching") expect(states[i]).toBe("done")
    }
    expect(states[lastSearchIdx]).toBe("active")
  })

  it("generating phase: first two phases done, last gen step active", () => {
    const states = computeStepStates(steps, "generating")
    expect(states[0]).toBe("done")
    expect(states[1]).toBe("done")
    let genIdx = -1
    for (let i = 0; i < steps.length; i++) {
      if (steps[i].phase === "generating") genIdx = i
    }
    expect(states[genIdx]).toBe("active")
  })

  it("extracting completes all but last which is active", () => {
    const states = computeStepStates(steps, "extracting")
    const allButLast = states.slice(0, -1)
    expect(allButLast.every((s) => s === "done")).toBe(true)
    expect(states[states.length - 1]).toBe("active")
  })

  it("all done when phase is done", () => {
    const states = computeStepStates(steps, "done")
    expect(states.every((s) => s === "done")).toBe(true)
  })

  it("works for all intents", () => {
    const queries = ["archivo", "código", "ley", "mapa", "informe", "busca", "docker", "sql", "arquitectura"]
    const phases: ChatLoadingPhase[] = ["classifying", "searching", "generating", "extracting"]
    for (const q of queries) {
      const s = getContextualSteps(q)
      for (const phase of phases) {
        const states = computeStepStates(s, phase)
        expect(states.filter((st) => st === "active")).toHaveLength(1)
      }
    }
  })
})
