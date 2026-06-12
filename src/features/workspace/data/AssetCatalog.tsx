import { useEffect, useMemo, useState, useRef } from "react"
import { DatabaseIcon, SearchIcon, ChevronDownIcon, ChevronRightIcon, XIcon, PlusIcon, RefreshCwIcon } from "lucide-react"

import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { AssetStatusBadge } from "@/features/workspace/data/DataUi"
import { formatRelativeTime } from "@/features/workspace/data/data-data"
import { DocumentAssetIcon } from "@/features/workspace/documents/DocumentAssetIcon"
import type { DataAsset } from "@/types/data"

type SortKey = "name" | "chunks" | "status" | "recent"

type AssetCatalogProps = {
  assets: DataAsset[]
  allAssets: DataAsset[]
  query: string
  onQueryChange: (query: string) => void
  onSelectAsset: (assetId: string) => void
  isLoading: boolean
}

export function AssetCatalog({
  assets,
  allAssets,
  query,
  onQueryChange,
  onSelectAsset,
  isLoading,
}: AssetCatalogProps) {
  const [inputValue, setInputValue] = useState(query)
  const [sortKey, setSortKey] = useState<SortKey>(() => {
    return (localStorage.getItem("geonexus-assets-sort") as SortKey) || "name"
  })
  const [page, setPage] = useState(0)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const inputRef = useRef<HTMLInputElement>(null)
  const perPage = 20

  useEffect(() => {
    localStorage.setItem("geonexus-assets-sort", sortKey)
  }, [sortKey])

  useEffect(() => {
    setInputValue(query)
  }, [query])

  useEffect(() => {
    const t = setTimeout(() => onQueryChange(inputValue), 200)
    return () => clearTimeout(t)
  }, [inputValue, onQueryChange])

  // Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const sorted = useMemo(() => {
    const list = [...assets]
    switch (sortKey) {
      case "name":
        list.sort((a, b) => a.name.localeCompare(b.name))
        break
      case "chunks":
        list.sort((a, b) => b.chunks - a.chunks)
        break
      case "status":
        const order = { ready: 0, indexing: 1, pending: 2, conflict: 3, error: 4 }
        list.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9))
        break
      case "recent":
        list.sort((a, b) => b.updated_at - a.updated_at)
        break
    }
    return list
  }, [assets, sortKey])

  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage))
  const paginated = sorted.slice(page * perPage, (page + 1) * perPage)

  // Reset page on search or sort change
  useEffect(() => {
    setPage(0)
  }, [query, sortKey])

  const groups = useMemo(() => {
    const grouped: Record<string, { label: string; emoji: string; assets: DataAsset[] }> = {
      document: { label: "Documentos", emoji: "📄", assets: [] },
      layer: { label: "Capas GIS", emoji: "🗺️", assets: [] },
      table: { label: "Tablas", emoji: "📊", assets: [] },
      other: { label: "Otros", emoji: "📦", assets: [] },
    }

    paginated.forEach((asset) => {
      let groupKey = "other"
      const kind = asset.kind.toLowerCase()
      if (["document", "documento", "pdf", "docx", "txt", "md"].includes(kind)) {
        groupKey = "document"
      } else if (["layer", "shapefile", "geojson", "gpkg", "kml", "raster"].includes(kind)) {
        groupKey = "layer"
      } else if (["csv", "xlsx", "xls", "tsv", "table", "tabla"].includes(kind)) {
        groupKey = "table"
      }
      grouped[groupKey].assets.push(asset)
    })

    return Object.entries(grouped).filter(([_, g]) => g.assets.length > 0)
  }, [paginated])

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleClearSearch = () => {
    setInputValue("")
    onQueryChange("")
    inputRef.current?.focus()
  }

  return (
    <section className="overflow-hidden rounded-lg border border-border/80 bg-card/95 shadow-sm backdrop-blur">
      <div className="grid gap-2 border-b border-border px-3 py-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div>
          <h2 className="text-sm font-semibold">Catálogo indexado</h2>
          <p className="text-xs leading-4 text-muted-foreground">
            Assets conectados, cacheados o listos para entrar al pipeline IA.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isLoading && allAssets.length > 0 && (
            <span className="text-xs text-muted-foreground mr-1">
              {assets.length} de {allAssets.length} assets
            </span>
          )}
          <label className="relative block md:w-64">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              className="h-8 pl-8 pr-7"
              placeholder="Buscar asset... (⌘K)"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            {inputValue && (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={handleClearSearch}
                aria-label="Limpiar búsqueda"
              >
                <XIcon className="size-3" />
              </button>
            )}
          </label>
          <select
            className="h-8 rounded-md border border-border bg-background px-2 text-xs"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
          >
            <option value="name">Nombre ↑</option>
            <option value="chunks">Chunks ↓</option>
            <option value="status">Estado</option>
            <option value="recent">Reciente</option>
          </select>
        </div>
      </div>

      <div className="divide-y divide-border">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="grid gap-2 px-3 py-2 md:grid-cols-[minmax(0,1fr)_7rem_7rem_7rem] md:items-center">
              <div className="flex items-center gap-2">
                <div className="size-6 animate-pulse rounded-md bg-muted/60" />
                <div className="h-4 w-40 animate-pulse rounded bg-muted/60" />
              </div>
              <div className="h-4 w-16 animate-pulse rounded bg-muted/60" />
              <div className="h-4 w-12 animate-pulse rounded bg-muted/60" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted/60 md:ml-auto" />
            </div>
          ))
        ) : allAssets.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <DatabaseIcon className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium">Sin assets indexados</p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                Los archivos conectados, cacheados o procesados aparecen aquí
                automáticamente una vez que configures una fuente de datos.
              </p>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Button size="sm" variant="outline" asChild>
                <a href="#conectores" className="flex items-center gap-1.5">
                  <PlusIcon className="size-3.5" />
                  Agregar conector
                </a>
              </Button>
            </div>
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
            <SearchIcon className="size-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">{`Sin resultados para "${query}"`}</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Prueba con el nombre del archivo, la fuente o la ruta donde está
              almacenado.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border bg-background/50">
            {groups.map(([groupKey, group]) => {
              const isCollapsed = collapsedGroups[groupKey]
              return (
                <div key={groupKey} className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => toggleGroup(groupKey)}
                    className="flex w-full items-center gap-2 bg-muted/20 px-3 py-2 text-left text-xs font-semibold hover:bg-muted/30 border-b border-border/40"
                  >
                    {isCollapsed ? (
                      <ChevronRightIcon className="size-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronDownIcon className="size-3.5 text-muted-foreground" />
                    )}
                    <span>
                      {group.emoji} {group.label} ({group.assets.length})
                    </span>
                  </button>
                  {!isCollapsed && (
                    <div className="divide-y divide-border/40">
                      {group.assets.map((asset) => (
                        <AssetRow
                          key={asset.id}
                          asset={asset}
                          onSelect={() => onSelectAsset(asset.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {!isLoading && allAssets.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground">
          <span>
            {page * perPage + 1}–{Math.min((page + 1) * perPage, sorted.length)} de{" "}
            {sorted.length} assets
          </span>
          <div className="flex gap-1">
            <button
              className="rounded px-2 py-1 hover:bg-muted/60 disabled:opacity-40"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </button>
            <button
              className="rounded px-2 py-1 hover:bg-muted/60 disabled:opacity-40"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

function AssetRow({
  asset,
  onSelect,
}: {
  asset: DataAsset
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className="grid w-full gap-2 px-3 py-2.5 text-left transition hover:bg-muted/30 md:grid-cols-[minmax(0,1fr)_7rem_7rem_7rem] md:items-center"
      onClick={onSelect}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-background ring-1 ring-border/50">
            <DocumentAssetIcon kind={asset.kind} className="size-4" />
          </span>
          <h3 className="truncate text-sm font-medium text-card-foreground" title={asset.name}>
            {asset.name}
          </h3>
        </div>
        <p className="mt-0.5 truncate text-[0.7rem] text-muted-foreground">
          {asset.source} / {asset.location}
        </p>
      </div>
      <div className="flex items-center">
        <AssetStatusBadge status={asset.status} />
      </div>
      <span className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{asset.chunks}</span>{" "}
        chunks
      </span>
      <span className="text-[0.7rem] text-muted-foreground md:text-right">
        {formatRelativeTime(asset.updated_at)}
      </span>
    </button>
  )
}
