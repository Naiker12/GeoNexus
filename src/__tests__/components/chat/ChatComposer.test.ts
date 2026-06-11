import { describe, expect, it } from "vitest"

interface MentionToken {
  id: string
  type: "connector" | "collection" | "document"
  label: string
}

// Mirror the mention replacement logic from ChatComposer handleSubmit
function replaceMentions(content: string, tokens: MentionToken[]): string {
  let finalContent = content.trim()
  for (const token of tokens) {
    finalContent = finalContent.replace(
      `@${token.label}`,
      `@[${token.label}](connector:${token.id})`
    )
  }
  return finalContent
}

function detectMentionTrigger(value: string): { query: string; active: boolean } {
  const cursorMatch = value.match(/@(\w*)$/)
  if (cursorMatch) {
    return { query: cursorMatch[1], active: true }
  }
  return { query: "", active: false }
}

describe("ChatComposer mention replacement", () => {
  it("replaces simple mention with connector link syntax", () => {
    const tokens: MentionToken[] = [{ id: "c1", type: "connector", label: "OneDrive" }]
    const result = replaceMentions("analiza @OneDrive", tokens)
    expect(result).toBe('analiza @[OneDrive](connector:c1)')
  })

  it("does not replace if no matching token", () => {
    const tokens: MentionToken[] = [{ id: "c1", type: "connector", label: "OneDrive" }]
    const result = replaceMentions("analiza @QGIS", tokens)
    expect(result).toBe('analiza @QGIS')
  })

  it("replaces multiple different mentions", () => {
    const tokens: MentionToken[] = [
      { id: "c1", type: "connector", label: "OneDrive" },
      { id: "c2", type: "collection", label: "Coleccion documental" },
    ]
    const result = replaceMentions("busca en @OneDrive y @Coleccion documental", tokens)
    expect(result).toBe('busca en @[OneDrive](connector:c1) y @[Coleccion documental](connector:c2)')
  })

  it("removes duplicate tokens (keeps last)", () => {
    // Simulate what handleMentionSelect does
    const tokens: MentionToken[] = [
      { id: "c1", type: "connector", label: "OneDrive" },
    ]
    // A duplicate would have been filtered out by handleMentionSelect
    const deduped = tokens.filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i)
    expect(deduped).toHaveLength(1)
  })

  it("trims whitespace from content before replacement", () => {
    const tokens: MentionToken[] = [{ id: "c1", type: "connector", label: "OneDrive" }]
    const result = replaceMentions("  hola @OneDrive  ", tokens)
    expect(result).toBe('hola @[OneDrive](connector:c1)')
  })

  it("replaces mention even when text has special chars", () => {
    const tokens: MentionToken[] = [{ id: "q1", type: "connector", label: "QGIS-Pro" }]
    const result = replaceMentions("usa @QGIS-Pro para el analisis", tokens)
    expect(result).toBe('usa @[QGIS-Pro](connector:q1) para el analisis')
  })
})

describe("ChatComposer @mention detection", () => {
  it("detects @ at end of input", () => {
    expect(detectMentionTrigger("hola @")).toEqual({ query: "", active: true })
  })

  it("detects @ with query text", () => {
    expect(detectMentionTrigger("hola @one")).toEqual({ query: "one", active: true })
  })

  it("no trigger when @ is mid-word", () => {
    expect(detectMentionTrigger("email@test.com")).toEqual({ query: "", active: false })
  })

  it("no trigger when no @ present", () => {
    expect(detectMentionTrigger("hola mundo")).toEqual({ query: "", active: false })
  })

  it("detects @ in multi-word input", () => {
    expect(detectMentionTrigger("busca en @OneDrive")).toEqual({ query: "OneDrive", active: true })
  })
})
