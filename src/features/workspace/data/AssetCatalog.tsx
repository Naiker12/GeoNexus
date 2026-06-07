import { SearchIcon } from "lucide-react"

import { Input } from "@/components/ui/Input"
import { AssetStatusBadge } from "@/features/workspace/data/DataUi"
import { formatRelativeTime } from "@/features/workspace/data/data-data"
import { DocumentAssetIcon } from "@/features/workspace/documents/DocumentAssetIcon"
import type { DataAsset } from "@/types/data"

type AssetCatalogProps = {
  assets: DataAsset[]
  query: string
  onQueryChange: (query: string) => void
  onSelectAsset: (assetId: string) => void
}

export function AssetCatalog({
  assets,
  query,
  onQueryChange,
  onSelectAsset,
}: AssetCatalogProps) {
  return (
    <section className="overflow-hidden rounded-lg border border-border/80 bg-card/95 shadow-sm backdrop-blur">
      <div className="grid gap-2 border-b border-border px-3 py-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div>
          <h2 className="text-sm font-semibold">Catalogo indexado</h2>
          <p className="text-xs leading-4 text-muted-foreground">
            Assets conectados, cacheados o listos para entrar al pipeline IA.
          </p>
        </div>
        <label className="relative block md:w-72">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-8 pl-8"
            placeholder="Buscar asset, fuente o ruta"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </label>
      </div>

      <div className="divide-y divide-border">
        {assets.map((asset) => (
          <AssetRow
            key={asset.id}
            asset={asset}
            onSelect={() => onSelectAsset(asset.id)}
          />
        ))}
      </div>
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
