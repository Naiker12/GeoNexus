import * as React from "react"

import { AssetCatalog } from "@/features/workspace/data/AssetCatalog"
import { AssetSheet } from "@/features/workspace/data/AssetSheet"
import { DataHeader } from "@/features/workspace/data/DataHeader"
import { LineagePanel, StoresPanel, SyncPanel } from "@/features/workspace/data/DataPanels"
import { dataAssets } from "@/features/workspace/data/data-data"

export function DataPage() {
  const [query, setQuery] = React.useState("")
  const [selectedAssetId, setSelectedAssetId] = React.useState<string | null>(null)

  const filteredAssets = dataAssets.filter((asset) =>
    [asset.name, asset.source, asset.location, asset.kind]
      .join(" ")
      .toLowerCase()
      .includes(query.trim().toLowerCase())
  )
  const selectedAsset = selectedAssetId
    ? dataAssets.find((asset) => asset.id === selectedAssetId)
    : undefined

  return (
    <section className="relative z-10 h-[calc(100svh-3.5rem)] overflow-auto px-3 py-3 sm:px-5 sm:py-4">
      <div className="mx-auto grid w-full max-w-[110rem] gap-3">
        <DataHeader />

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_25rem]">
          <div className="grid min-w-0 gap-3">
            <AssetCatalog
              assets={filteredAssets}
              query={query}
              onQueryChange={setQuery}
              onSelectAsset={setSelectedAssetId}
            />
            <LineagePanel />
          </div>
          <aside className="grid content-start gap-3">
            <StoresPanel />
            <SyncPanel />
          </aside>
        </div>
      </div>

      <AssetSheet
        asset={selectedAsset}
        open={Boolean(selectedAsset)}
        onOpenChange={(open) => {
          if (!open) setSelectedAssetId(null)
        }}
      />
    </section>
  )
}
