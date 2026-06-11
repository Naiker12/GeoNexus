export interface ConnectCardData {
  type: "connect_card"
  connectorId: string
  reason?: string
}

export interface ContentSegment {
  kind: "text" | "connect_card"
  value: string | ConnectCardData
}

export function parseContent(content: string): ContentSegment[] {
  const segments: ContentSegment[] = []
  const regex = /\{"type":"connect_card"[^}]+\}/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: "text", value: content.slice(lastIndex, match.index) })
    }
    try {
      const data = JSON.parse(match[0]) as ConnectCardData
      if (data.type === "connect_card") {
        segments.push({ kind: "connect_card", value: data })
      }
    } catch {
      segments.push({ kind: "text", value: match[0] })
    }
    lastIndex = regex.lastIndex
  }

  if (lastIndex < content.length) {
    segments.push({ kind: "text", value: content.slice(lastIndex) })
  }

  return segments.length > 0 ? segments : [{ kind: "text", value: content }]
}
