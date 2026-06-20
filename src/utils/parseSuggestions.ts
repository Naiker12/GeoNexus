const TRIGGER_PHRASES = [
  /puedo ayudarte con[:\s]/i,
  /¿te interesa[?:\s]/i,
  /¿en qué (te )?puedo (apoyar|ayudar)\?/i,
  /por ejemplo[:\s]/i,
  /aquí tienes (algunas |unas )?sugerencias[:\s]/i,
  /puedes preguntarme[:\s]/i,
]

export function parseSuggestions(content: string): {
  mainContent: string
  suggestions: string[]
} {
  const lines = (content ?? "").split("\n")
  let splitIndex = -1

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim()
    if (TRIGGER_PHRASES.some((re) => re.test(line))) {
      splitIndex = i
      break
    }
  }

  if (splitIndex === -1) return { mainContent: content, suggestions: [] }

  const mainContent = lines.slice(0, splitIndex).join("\n").trim()
  const suggestionLines = lines
    .slice(splitIndex + 1)
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter((l) => l.length > 0 && l.length < 100)

  if (suggestionLines.length < 2)
    return { mainContent: content, suggestions: [] }

  return { mainContent, suggestions: suggestionLines }
}
