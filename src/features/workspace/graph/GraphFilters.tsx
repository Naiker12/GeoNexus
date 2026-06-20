import { FilterIcon, XIcon } from "lucide-react"
import * as React from "react"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import { nodeDotColor } from "./NodeSheet"
import { nodeTypeLabel } from "./graph-colors"
import type { GraphNodeKind } from "@/types/graph"

export type KindFilter = "all" | GraphNodeKind

export const KIND_OPTIONS: Array<{ value: KindFilter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "norma", label: "Norma" },
  { value: "documento", label: "Documento" },
  { value: "capa", label: "Capa GIS" },
  { value: "zona", label: "Zona" },
  { value: "concept", label: "Concepto" },
  { value: "chat_turn", label: "Chat" },
  { value: "web_search", label: "Web" },
  { value: "upload", label: "Subida" },
  { value: "connector", label: "Conector" },
  { value: "rag_recall", label: "RAG" },
]

export function GraphFilters({
  kindFilter,
  onKindFilterChange,
}: {
  kindFilter: KindFilter
  onKindFilterChange: (f: KindFilter) => void
}) {
  const [filterOpen, setFilterOpen] = React.useState(false)

  return filterOpen ? (
    <div className="flex flex-wrap items-center gap-0.5 rounded-md border border-border bg-card/90 px-1 text-xs shadow-sm">
      {KIND_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => {
            onKindFilterChange(opt.value)
            setFilterOpen(false)
          }}
          className={`flex items-center gap-1 rounded px-1.5 py-1 transition-colors ${
            kindFilter === opt.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {opt.value !== "all" && (
            <span className={cn("size-2 rounded-full inline-block", nodeDotColor(opt.value as GraphNodeKind))} />
          )}
          {opt.label}
        </button>
      ))}
      <button
        type="button"
        onClick={() => setFilterOpen(false)}
        className="ml-1 text-muted-foreground hover:text-foreground"
      >
        <XIcon className="size-3" />
      </button>
    </div>
  ) : (
    <Button variant="outline" size="sm" className="h-7 bg-card/90" onClick={() => setFilterOpen(true)}>
      <FilterIcon className="size-4" />
      {kindFilter === "all" ? "Filtros" : KIND_OPTIONS.find((o) => o.value === kindFilter)?.label}
    </Button>
  )
}
