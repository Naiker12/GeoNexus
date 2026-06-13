import { useEffect } from "react"
import type { AgentSourceType } from "@/types/agents"

const SOURCES: Array<{ id: AgentSourceType; icon: string; label: string; description: string }> = [
  { id: "onedrive",   icon: "☁️",  label: "OneDrive",   description: "Buscar en OneDrive" },
  { id: "filesystem", icon: "📁",  label: "Archivos",   description: "Carpetas locales" },
  { id: "qgis",       icon: "🗺️", label: "QGIS",       description: "Capas y procesos QGIS" },
  { id: "arcgis",     icon: "🌐",  label: "ArcGIS",     description: "ArcGIS Online / Portal" },
  { id: "memory",     icon: "🧠",  label: "Memoria",    description: "Memoria semántica (ChromaDB)" },
  { id: "graph",      icon: "🕸️", label: "Grafo",      description: "Knowledge Graph" },
  { id: "github",     icon: "🐙",  label: "GitHub",     description: "Repositorios Git" },
]

export function MentionPicker({
  query,
  onSelect,
  onClose,
}: {
  query: string
  onSelect: (source: AgentSourceType) => void
  onClose: () => void
}) {
  const filtered = SOURCES.filter((s) =>
    s.id.includes(query.toLowerCase()) || s.label.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  return (
    <div className="absolute bottom-full left-0 z-50 mb-1 w-72 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
      <div className="max-h-48 overflow-y-auto">
        {filtered.map((source) => (
          <button
            key={source.id}
            onClick={() => onSelect(source.id)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
          >
            <span className="text-lg">{source.icon}</span>
            <div className="min-w-0">
              <p className="font-medium">{source.label}</p>
              <p className="text-xs text-muted-foreground">{source.description}</p>
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="px-3 py-3 text-xs text-muted-foreground">
            Sin resultados para &ldquo;@{query}&rdquo;
          </p>
        )}
      </div>
    </div>
  )
}

export function parseMentions(text: string): { cleaned: string; mentions: AgentSourceType[] } {
  const regex = /@(onedrive|filesystem|qgis|arcgis|memory|graph|github)/gi
  const mentions: AgentSourceType[] = []
  const cleaned = text.replace(regex, (_, m) => {
    mentions.push(m.toLowerCase() as AgentSourceType)
    return ""
  }).trim()
  return { cleaned, mentions }
}
