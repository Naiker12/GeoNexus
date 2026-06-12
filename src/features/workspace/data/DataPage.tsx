import * as React from "react"
import { AlertCircleIcon, RefreshCwIcon } from "lucide-react"
import { toast } from "sonner"

import {
  DEFAULT_PROJECT_ID,
  getDataStoreMetrics,
  getSyncEvents,
  isTauriAvailable,
  listDataAssets,
} from "@/api/data"
import { Button } from "@/components/ui/Button"
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
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [tauriOk, setTauriOk] = React.useState<boolean | null>(null)

  const loadData = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const tauri = await isTauriAvailable()
    setTauriOk(tauri)
    if (!tauri) {
      setIsLoading(false)
      return
    }

    try {
      const [assetsRes, metricsRes, eventsRes] = await Promise.allSettled([
        listDataAssets(DEFAULT_PROJECT_ID),
        getDataStoreMetrics(DEFAULT_PROJECT_ID),
        getSyncEvents(DEFAULT_PROJECT_ID),
      ])
      if (assetsRes.status === "fulfilled") setAssets(assetsRes.value)
      else console.error("listDataAssets failed", assetsRes.reason)
      if (metricsRes.status === "fulfilled") setMetrics(metricsRes.value)
      else console.error("getDataStoreMetrics failed", metricsRes.reason)
      if (eventsRes.status === "fulfilled") setEvents(eventsRes.value)
      else console.error("getSyncEvents failed", eventsRes.reason)

      const someLoaded = [assetsRes, metricsRes, eventsRes].some(
        (r) => r.status === "fulfilled"
      )
      if (!someLoaded) {
        setError("No se pudieron cargar los datos del centro de datos.")
      } else {
        const failed = [assetsRes, metricsRes, eventsRes].filter(
          (r) => r.status === "rejected"
        ).length
        if (failed > 0) {
          toast.error(`${failed} store(s) no respondieron`)
        }


      }
    } catch (e) {
      setError("No se pudieron cargar los datos del centro de datos.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  const filteredAssets = React.useMemo(
    () =>
      query
        ? assets.filter((asset) =>
            [asset.name, asset.source, asset.location, asset.kind]
              .join(" ")
              .toLowerCase()
              .includes(query.trim().toLowerCase())
          )
        : assets,
    [assets, query]
  )

  const selectedAsset = selectedAssetId
    ? assets.find((asset) => asset.id === selectedAssetId)
    : undefined

  return (
    <section className="relative z-10 h-[calc(100svh-3.5rem)] overflow-auto px-3 py-3 sm:px-5 sm:py-4">
      <div className="mx-auto grid w-full max-w-[110rem] gap-3">
        {tauriOk === false && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700">
            <AlertCircleIcon className="size-4 shrink-0" />
            <span className="flex-1">
              Centro de datos no disponible fuera de la app nativa. Los datos se
              muestran en vacío por ahora.
            </span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircleIcon className="size-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <Button variant="ghost" size="sm" onClick={loadData}>
              <RefreshCwIcon className="size-3.5" />
              Reintentar
            </Button>
          </div>
        )}

        <DataHeader assets={assets} metrics={metrics} isLoading={isLoading} onRefresh={loadData} />

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_25rem]">
          <div className="grid min-w-0 gap-3">
            <AssetCatalog
              assets={filteredAssets}
              allAssets={assets}
              query={query}
              onQueryChange={setQuery}
              onSelectAsset={setSelectedAssetId}
              isLoading={isLoading}
            />
            <LineagePanel metrics={metrics} />
          </div>
          <aside className="grid content-start gap-3">
            <StoresPanel metrics={metrics} />
            <SyncPanel events={events} isLoading={isLoading} onRefresh={loadData} />
          </aside>
        </div>
      </div>

      <AssetSheet
        asset={selectedAsset}
        open={Boolean(selectedAsset)}
        onOpenChange={(open) => {
          if (!open) setSelectedAssetId(null)
        }}
        onRefresh={loadData}
      />
    </section>
  )
}
