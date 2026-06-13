import { describe, expect, it } from "vitest"
import { getContextualSteps } from "@/components/chat/contextualSteps"

describe("getContextualSteps", () => {
  it("detects files intent from .ts extension", () => {
    const steps = getContextualSteps("¿Cómo funciona main.ts?")
    expect(steps[0].label).toBe("Identificando archivos relevantes")
  })

  it("detects files intent from 'archivo' keyword", () => {
    const steps = getContextualSteps("léeme el archivo config.json")
    expect(steps[0].label).toBe("Identificando archivos relevantes")
  })

  it("detects code intent", () => {
    const steps = getContextualSteps("encuentra el bug en esta función")
    expect(steps[0].label).toBe("Analizando la consulta de código")
  })

  it("detects normativa intent", () => {
    const steps = getContextualSteps("¿Qué dice el artículo 45 del POT?")
    expect(steps[0].label).toBe("Identificando normativa relevante")
  })

  it("detects spatial intent", () => {
    const steps = getContextualSteps("genera un buffer de 500m en la capa vías")
    expect(steps[0].label).toBe("Detectando consulta espacial")
  })

  it("detects memory intent", () => {
    const steps = getContextualSteps("¿qué hicimos en la sesión anterior?")
    expect(steps[0].label).toBe("Recuperando memoria de la sesión")
  })

  it("detects report intent", () => {
    const steps = getContextualSteps("genera el informe del proyecto")
    expect(steps[0].label).toBe("Analizando estructura del informe")
  })

  it("detects web search intent", () => {
    const steps = getContextualSteps("búscame en internet noticias climáticas recientes")
    expect(steps[0].label).toBe("Formulando consulta de búsqueda")
  })

  it("detects devops intent", () => {
    const steps = getContextualSteps("instalar docker en el servidor")
    expect(steps[0].label).toBe("Analizando consulta de infraestructura")
  })

  it("detects database intent", () => {
    const steps = getContextualSteps("haz una query SQL para esa tabla")
    expect(steps[0].label).toBe("Identificando consulta de base de datos")
  })

  it("detects architecture intent", () => {
    const steps = getContextualSteps("diseña la arquitectura del sistema")
    expect(steps[0].label).toBe("Analizando consulta de arquitectura")
  })

  it("falls back to general for unknown queries", () => {
    const steps = getContextualSteps("hola mundo")
    expect(steps[0].label).toBe("Analizando consulta")
  })

  it("returns 5 steps for all intents", () => {
    const queries = ["hola", "archivo", "código", "ley", "mapa", "informe", "busca"]
    for (const q of queries) {
      expect(getContextualSteps(q)).toHaveLength(5)
    }
  })

  it("all step IDs are unique per intent", () => {
    const queries = ["hola", "archivo", "código", "ley", "mapa", "informe", "busca", "docker", "sql", "arquitectura"]
    for (const q of queries) {
      const steps = getContextualSteps(q)
      const ids = steps.map((s) => s.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})
