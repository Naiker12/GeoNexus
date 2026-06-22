/** System prompt builder (inspired by Hermes prompt_builder/). */

export interface BuildPromptOptions {
  projectContext?: string
  skillContents?: string[]
  recentMessages?: { role: string; content: string }[]
  webSearchResults?: string
  date?: string
}

const BASE_SYSTEM_PROMPT = `Eres GeoAgents, un asistente de inteligencia artificial experto en análisis geoespacial, datos técnicos y automatización de tareas GIS.`

export function buildSystemPrompt(opts: BuildPromptOptions = {}): string {
  const parts: string[] = [BASE_SYSTEM_PROMPT]

  const date = opts.date ?? new Date().toISOString().split("T")[0]
  parts.push(`\nFecha actual: ${date}`)

  if (opts.projectContext) {
    parts.push(`\n## Contexto del proyecto\n${opts.projectContext}`)
  }

  if (opts.skillContents?.length) {
    parts.push(`\n## Skills activos\n${opts.skillContents.join("\n\n---\n\n")}`)
  }

  if (opts.webSearchResults) {
    parts.push(`\n## Resultados de búsqueda web\n${opts.webSearchResults}`)
  }

  return parts.join("\n")
}

export function buildUserPrompt(content: string, _opts?: { attachments?: { name: string; type: string }[] }): string {
  return content
}
