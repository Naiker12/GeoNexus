import * as React from "react"
import { CloudIcon, DatabaseIcon, FileTextIcon, HardDriveIcon } from "lucide-react"

import { useConnectors } from "@/contexts/ConnectorsContext"
import { cn } from "@/lib/utils"

export type MentionItemType = "connector" | "collection" | "document"

export interface MentionItem {
  id: string
  type: MentionItemType
  label: string
  connected: boolean
}

interface MentionPickerProps {
  query: string
  onSelect: (item: MentionItem) => void
  onClose: () => void
}

const sourceIcons: Record<string, typeof CloudIcon> = {
  onedrive: CloudIcon,
  local: HardDriveIcon,
  chromadb: DatabaseIcon,
  document: FileTextIcon,
}

export function MentionPicker({ query, onSelect, onClose }: MentionPickerProps) {
  const { connectors } = useConnectors()
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const pickerRef = React.useRef<HTMLDivElement>(null)

  const items: MentionItem[] = React.useMemo(() => {
    const result: MentionItem[] = []

    for (const c of connectors) {
      result.push({
        id: c.id,
        type: "connector",
        label: c.name,
        connected: c.status === "online",
      })
    }

    result.push(
      { id: "chroma-docs", type: "collection", label: "Coleccion documental", connected: false },
      { id: "chroma-gis", type: "collection", label: "Coleccion GIS", connected: false }
    )

    return result
  }, [connectors])

  const filtered = React.useMemo(() => {
    if (!query.trim()) return items
    const q = query.toLowerCase()
    return items.filter((item) => item.label.toLowerCase().includes(q))
  }, [items, query])

  React.useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [onClose])

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
      ref={pickerRef}
      className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-xl border border-border bg-card shadow-xl"
      onKeyDown={handleKeyDown}
    >
      <div className="max-h-48 overflow-y-auto p-1.5">
        {filtered.map((item, index) => {
          const Icon = sourceIcons[item.type] ?? CloudIcon

          return (
            <button
              key={`${item.type}-${item.id}`}
              type="button"
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                index === selectedIndex
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
              onClick={() => onSelect(item)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="flex size-6 items-center justify-center rounded-md bg-background">
                <Icon className="size-3.5" />
              </div>
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {!item.connected && (
                <span className="shrink-0 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[0.6rem] font-medium text-amber-600">
                  Desconectado
                </span>
              )}
              {item.connected && (
                <span className="shrink-0 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[0.6rem] font-medium text-emerald-600">
                  Conectado
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
