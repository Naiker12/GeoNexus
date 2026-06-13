import type { ChatLoadingPhase } from "@/components/chat/ChatLoadingIndicator"

export interface ContextualStep {
  id: string
  label: string
  phase: ChatLoadingPhase
}

function detectIntent(query: string): string {
  const q = query.toLowerCase()

  if (/archivo|file|leer|read|abrir|open|\.ts|\.rs|\.py|\.java|\.kt/.test(q))
    return "files"
  if (/código|code|función|function|clase|class|implementa|refactor|bug|error/.test(q))
    return "code"
  if (/artículo|norma|pot|decreto|resolución|reglamento|ley |legal/.test(q))
    return "normativa"
  if (/capa|layer|buffer|distancia|radio|shapefile|geojson|mapa|spatial/.test(q))
    return "spatial"
  if (/qué hicimos|continuar|resumen|historia|anterior|recuerda|conversación/.test(q))
    return "memory"
  if (/informe|reporte|exportar|genera|documento|entregable/.test(q))
    return "report"
  if (/busca|web|internet|reciente|noticias|actual/.test(q))
    return "web"
  if (/instalar|configurar|setup|deploy|docker|kubernetes|ci/.test(q))
    return "devops"
  if (/base de datos|database|sql|query|tabla|schema|migrate/.test(q))
    return "database"
  if (/arquitectura|diseño|patrón|pattern|estructura|sistema/.test(q))
    return "architecture"

  return "general"
}

const STEPS_BY_INTENT: Record<string, ContextualStep[]> = {
  files: [
    { id: "classify",  label: "Identificando archivos relevantes",   phase: "classifying" },
    { id: "read",      label: "Leyendo contenido del archivo",        phase: "searching"   },
    { id: "analyze",   label: "Analizando estructura y dependencias", phase: "generating"  },
    { id: "reason",    label: "Razonando sobre el código",            phase: "generating"  },
    { id: "gen",       label: "Generando respuesta",                  phase: "extracting"  },
  ],
  code: [
    { id: "classify",  label: "Analizando la consulta de código",     phase: "classifying" },
    { id: "context",   label: "Recuperando contexto del proyecto",    phase: "searching"   },
    { id: "reason",    label: "Razonando sobre la implementación",    phase: "generating"  },
    { id: "write",     label: "Escribiendo el código",                phase: "generating"  },
    { id: "gen",       label: "Revisando y generando respuesta",      phase: "extracting"  },
  ],
  normativa: [
    { id: "classify",  label: "Identificando normativa relevante",    phase: "classifying" },
    { id: "rag",       label: "Buscando artículos en documentos",     phase: "searching"   },
    { id: "graph",     label: "Consultando grafo normativo",          phase: "searching"   },
    { id: "reason",    label: "Interpretando la normativa",           phase: "generating"  },
    { id: "gen",       label: "Generando análisis",                   phase: "extracting"  },
  ],
  spatial: [
    { id: "classify",  label: "Detectando consulta espacial",         phase: "classifying" },
    { id: "layers",    label: "Identificando capas disponibles",      phase: "searching"   },
    { id: "graph",     label: "Consultando grafo de conocimiento",    phase: "searching"   },
    { id: "reason",    label: "Razonando sobre el análisis GIS",      phase: "generating"  },
    { id: "gen",       label: "Generando respuesta espacial",         phase: "extracting"  },
  ],
  memory: [
    { id: "classify",  label: "Recuperando memoria de la sesión",     phase: "classifying" },
    { id: "history",   label: "Leyendo historial de conversación",    phase: "searching"   },
    { id: "graph",     label: "Consultando grafo de entidades",       phase: "searching"   },
    { id: "reason",    label: "Construyendo contexto acumulado",      phase: "generating"  },
    { id: "gen",       label: "Generando continuación",               phase: "extracting"  },
  ],
  report: [
    { id: "classify",  label: "Analizando estructura del informe",    phase: "classifying" },
    { id: "context",   label: "Recopilando datos del proyecto",       phase: "searching"   },
    { id: "rag",       label: "Buscando documentación relevante",     phase: "searching"   },
    { id: "reason",    label: "Estructurando el contenido",           phase: "generating"  },
    { id: "gen",       label: "Redactando el informe",                phase: "extracting"  },
  ],
  web: [
    { id: "classify",  label: "Formulando consulta de búsqueda",      phase: "classifying" },
    { id: "search",    label: "Buscando en fuentes externas",         phase: "searching"   },
    { id: "read",      label: "Leyendo resultados relevantes",        phase: "searching"   },
    { id: "reason",    label: "Sintetizando información",             phase: "generating"  },
    { id: "gen",       label: "Generando respuesta actualizada",      phase: "extracting"  },
  ],
  devops: [
    { id: "classify",  label: "Analizando consulta de infraestructura", phase: "classifying" },
    { id: "context",   label: "Buscando configuraciones relevantes",  phase: "searching"   },
    { id: "reason",    label: "Evaluando el entorno y dependencias",  phase: "generating"  },
    { id: "write",     label: "Preparando instrucciones",             phase: "generating"  },
    { id: "gen",       label: "Generando guía de implementación",     phase: "extracting"  },
  ],
  database: [
    { id: "classify",  label: "Identificando consulta de base de datos", phase: "classifying" },
    { id: "schema",    label: "Analizando esquema y relaciones",      phase: "searching"   },
    { id: "reason",    label: "Razonando sobre la query",             phase: "generating"  },
    { id: "write",     label: "Construyendo la solución",             phase: "generating"  },
    { id: "gen",       label: "Generando respuesta",                  phase: "extracting"  },
  ],
  architecture: [
    { id: "classify",  label: "Analizando consulta de arquitectura",  phase: "classifying" },
    { id: "context",   label: "Evaluando el sistema actual",          phase: "searching"   },
    { id: "patterns",  label: "Consultando patrones relevantes",      phase: "searching"   },
    { id: "reason",    label: "Diseñando la solución",                phase: "generating"  },
    { id: "gen",       label: "Generando propuesta de arquitectura",  phase: "extracting"  },
  ],
  general: [
    { id: "classify",  label: "Analizando consulta",                  phase: "classifying" },
    { id: "context",   label: "Recuperando documentos y contexto",    phase: "searching"   },
    { id: "search",    label: "Buscando en fuentes externas",         phase: "searching"   },
    { id: "reason",    label: "Razonando con la información",         phase: "generating"  },
    { id: "gen",       label: "Generando respuesta",                  phase: "extracting"  },
  ],
}

const PHASE_ORDER: ChatLoadingPhase[] = [
  "classifying",
  "searching",
  "generating",
  "extracting",
  "idle",
  "done",
]

function phaseIndex(phase: ChatLoadingPhase): number {
  return PHASE_ORDER.indexOf(phase)
}

export function getContextualSteps(query: string): ContextualStep[] {
  const intent = detectIntent(query)
  return STEPS_BY_INTENT[intent] ?? STEPS_BY_INTENT.general
}

export type StepState = "done" | "active" | "pending"

export function computeStepStates(
  steps: ContextualStep[],
  phase: ChatLoadingPhase
): StepState[] {
  const currentIdx = phaseIndex(phase)

  return steps.map((step) => {
    const stepIdx = phaseIndex(step.phase)

    if (currentIdx > stepIdx) return "done"
    if (currentIdx === stepIdx) {
      const stepsInSamePhase = steps.filter((s) => s.phase === step.phase)
      const lastInPhase = stepsInSamePhase[stepsInSamePhase.length - 1]
      return step.id === lastInPhase.id ? "active" : "done"
    }
    return "pending"
  })
}
