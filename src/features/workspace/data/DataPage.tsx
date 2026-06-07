import * as React from "react"

import {
  getDataStoreMetrics,
  getSyncEvents,
  listDataAssets,
} from "@/api/data"
import { AssetCatalog } from "@/features/workspace/data/AssetCatalog"
import { AssetSheet } from "@/features/workspace/data/AssetSheet"
import { DataHeader } from "@/features/workspace/data/DataHeader"
import { LineagePanel, StoresPanel, SyncPanel } from "@/features/workspace/data/DataPanels"
import {
  dataAssets,
  defaultMetrics,
  syncEvents,
} from "@/features/workspace/data/data-data"
import type { DataAsset, DataStoreMetrics, SyncEvent } from "@/types/data"

export function DataPage() {
  const [assets, setAssets] = React.useState<DataAsset[]>(dataAssets)
  const [metrics, setMetrics] = React.useState<DataStoreMetrics>(defaultMetrics)
  const [events, setEvents] = React.useState<SyncEvent[]>(syncEvents)
  const [query, setQuery] = React.useState("")
  const [selectedAssetId, setSelectedAssetId] = React.useState<string | null>(null)

  React.useEffect(() => {
    let active = true

    Promise.all([
      listDataAssets(),
      getDataStoreMetrics(),
      getSyncEvents(),
    ]).then(([nextAssets, nextMetrics, nextEvents]) => {
      if (!active) return

      setAssets(nextAssets)
      setMetrics(nextMetrics)
      setEvents(nextEvents)
    })

    return () => {
      active = false
    }
  }, [])

  const filteredAssets = assets.filter((asset) =>
    [asset.name, asset.source, asset.location, asset.kind]
      .join(" ")
      .toLowerCase()
      .includes(query.trim().toLowerCase())
  )
  const selectedAsset = selectedAssetId
    ? assets.find((asset) => asset.id === selectedAssetId)
    : undefined

  return (
    <section className="relative z-10 h-[calc(100svh-3.5rem)] overflow-auto px-3 py-3 sm:px-5 sm:py-4">
      <div className="mx-auto grid w-full max-w-[110rem] gap-3">
        <DataHeader assets={assets} />

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
            <StoresPanel metrics={metrics} />
            <SyncPanel events={events} />
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
