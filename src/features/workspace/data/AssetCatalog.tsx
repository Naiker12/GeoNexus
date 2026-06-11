import { useEffect, useMemo, useState } from "react"
import { DatabaseIcon, SearchIcon } from "lucide-react"

import { Input } from "@/components/ui/Input"
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
  onSeedDemo?: () => void
}

export function AssetCatalog({
  assets,
  allAssets,
  query,
  onQueryChange,
  onSelectAsset,
  isLoading,
  onSeedDemo,
}: AssetCatalogProps) {
  const [inputValue, setInputValue] = useState(query)
  const [sortKey, setSortKey] = useState<SortKey>("name")
  const [page, setPage] = useState(0)
  const perPage = 20

  useEffect(() => {
    const t = setTimeout(() => onQueryChange(inputValue), 200)
    return () => clearTimeout(t)
  }, [inputValue, onQueryChange])

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

  useEffect(() => {
    setPage(0)
  }, [query, sortKey])

  return (
    <section className="overflow-hidden rounded-lg border border-border/80 bg-card/95 shadow-sm backdrop-blur">
      <div className="grid gap-2 border-b border-border px-3 py-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div>
          <h2 className="text-sm font-semibold">Catalogo indexado</h2>
          <p className="text-xs leading-4 text-muted-foreground">
            Assets conectados, cacheados o listos para entrar al pipeline IA.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative block md:w-64">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 pl-8"
              placeholder="Buscar asset, fuente o ruta"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
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
          <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
            <DatabaseIcon className="size-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">Sin assets indexados</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Los archivos conectados, cacheados o procesados aparecen aquí
              automáticamente una vez que configures una fuente de datos.
            </p>
            {onSeedDemo && (
              <button
                type="button"
                onClick={onSeedDemo}
                className="mt-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium transition hover:bg-muted/60"
              >
                Cargar datos de demostración
              </button>
            )}
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
          paginated.map((asset) => (
            <AssetRow
              key={asset.id}
              asset={asset}
              onSelect={() => onSelectAsset(asset.id)}
            />
          ))
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
      className="grid w-full gap-2 px-3 py-2 text-left transition hover:bg-muted/35 md:grid-cols-[minmax(0,1fr)_7rem_7rem_7rem] md:items-center"
      onClick={onSelect}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-background">
            <DocumentAssetIcon kind={asset.kind} className="size-4" />
          </span>
          <h3 className="truncate text-sm font-medium">{asset.name}</h3>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {asset.source} / {asset.location}
        </p>
      </div>
      <AssetStatusBadge status={asset.status} />
      <span className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{asset.chunks}</span>{" "}
        chunks
      </span>
      <span className="text-xs text-muted-foreground md:text-right">
        {formatRelativeTime(asset.updated_at)}
      </span>
    </button>
  )
}
