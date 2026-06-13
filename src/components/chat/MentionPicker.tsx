import * as React from "react"
import {
  CloudIcon,
  DatabaseIcon,
  FileTextIcon,
  FolderIcon,
  GitForkIcon,
  HardDriveIcon,
  CpuIcon,
  PuzzleIcon,
  LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import type { MentionKind, MentionSource } from "@/types/chat"

interface MentionPickerProps {
  query: string
  sources: MentionSource[]
  onSelect: (source: MentionSource) => void
  onClose: () => void
  containerRef?: React.RefObject<HTMLDivElement | null>
}

const kindIcons: Record<MentionKind, LucideIcon> = {
  connector: CloudIcon,
  asset: FileTextIcon,
  graph_node: GitForkIcon,
  agent_source: CpuIcon,
  skill: PuzzleIcon,
}

const kindLabels: Record<MentionKind, string> = {
  connector: "Conectores",
  asset: "Assets recientes",
  graph_node: "Grafo",
  agent_source: "Agentes",
  skill: "Skills",
}

const kindOrder: MentionKind[] = ["connector", "asset", "graph_node", "skill", "agent_source"]

export function MentionPicker({ query, sources, onSelect, onClose, containerRef }: MentionPickerProps) {
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const internalRef = React.useRef<HTMLDivElement>(null) as React.MutableRefObject<HTMLDivElement | null>

  const filtered = React.useMemo(() => {
    if (!query.trim()) return sources
    const q = query.toLowerCase()
    return sources.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.sublabel?.toLowerCase().includes(q)
    )
  }, [sources, query])

  const grouped = React.useMemo(() => {
    const groups = new Map<MentionKind, MentionSource[]>()
    for (const k of kindOrder) groups.set(k, [])
    for (const item of filtered) {
      const arr = groups.get(item.kind)
      if (arr) arr.push(item)
    }
    return groups
  }, [filtered])

  React.useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const el = containerRef?.current ?? internalRef.current
      if (el && !el.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [onClose, containerRef])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1))
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
        break
      case "Enter":
        e.preventDefault()
        if (filtered[selectedIndex]) {
          onSelect(filtered[selectedIndex])
        }
        break
      case "Escape":
        e.preventDefault()
        onClose()
        break
    }
  }

  if (filtered.length === 0) return null

  return (
    <div
      ref={(el) => {
        internalRef.current = el
        if (containerRef) (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el
      }}
      className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-xl border border-border bg-card shadow-xl"
      onKeyDown={handleKeyDown}
    >
      <div className="max-h-48 overflow-y-auto p-1.5">
        {kindOrder.map((kind) => {
          const items = grouped.get(kind) ?? []
          if (items.length === 0) return null
          return (
            <div key={kind}>
              <div className="px-2.5 py-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                {kindLabels[kind]}
              </div>
              {items.map((item) => {
                const Icon = kindIcons[item.kind] ?? CloudIcon
                const isSelected = item === filtered[selectedIndex]
                return (
                  <button
                    key={`${item.kind}-${item.id}`}
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                      isSelected
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                    onClick={() => onSelect(item)}
                    onMouseEnter={() => setSelectedIndex(filtered.indexOf(item))}
                  >
                    <div
                      className="flex size-6 items-center justify-center rounded-md"
                      style={{ backgroundColor: `${item.color}18` }}
                    >
                      <Icon className="size-3.5" style={{ color: item.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{item.label}</div>
                      {item.sublabel && (
                        <div className="truncate text-[0.7rem] text-muted-foreground">
                          {item.sublabel}
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
