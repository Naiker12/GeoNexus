import * as React from "react"

type SortField = "name" | "updated"

type DocumentFiltersProps = {
  searchQuery: string
  onSearchChange: (query: string) => void
  sortBy: SortField
  onSortChange: (sort: SortField) => void
}

function DocumentFilters({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
}: DocumentFiltersProps) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Buscar documentos..."
        className="h-7 rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-primary/50 w-40"
      />
      <select
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value as SortField)}
        className="h-7 rounded-md border border-border bg-background px-1 text-xs outline-none"
      >
        <option value="updated">Reciente</option>
        <option value="name">Nombre</option>
      </select>
    </div>
  )
}

export { DocumentFilters }
export type { SortField, DocumentFiltersProps }
