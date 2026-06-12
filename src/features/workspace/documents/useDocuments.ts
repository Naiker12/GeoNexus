import * as React from "react"
import { listDataAssets, indexDocument } from "@/api/data"
import { registerLocalConnector, syncLocalConnector } from "@/api/connector"
import { invoke } from "@tauri-apps/api/core"
import type { DataAsset } from "@/types/data"

const DEFAULT_PROJECT_ID = "project-default"
const WORKSPACE_ID = "workspace-main"

export function useDocuments() {
  const [assets, setAssets] = React.useState<DataAsset[]>([])
  const [loading, setLoading] = React.useState(true)
  const [indexingAssetId, setIndexingAssetId] = React.useState<string | null>(null)

  const fetchAssets = React.useCallback(async () => {
    setLoading(true)
    try {
      const data = await listDataAssets(DEFAULT_PROJECT_ID)
      const docTypes = ["document", "word", "excel", "other", "shapefile", "layer", "csv", "raster"]
      const filtered = data.filter((a) => docTypes.includes(a.kind))
      setAssets(filtered)
    } catch (err) {
      console.error("[useDocuments] fetchAssets:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  const totalChunks = React.useMemo(
    () => assets.reduce((sum, a) => sum + a.chunks, 0),
    [assets]
  )

  async function uploadDocument(file: File) {
    try {
      const bytes = await file.arrayBuffer()
      const assetId = await invoke<string>("upload_asset_file", {
        projectId: DEFAULT_PROJECT_ID,
        workspaceId: WORKSPACE_ID,
        connectorId: "local-upload",
        fileName: file.name,
        bytes: Array.from(new Uint8Array(bytes)),
      })
      await fetchAssets()
      // No auto-index: el usuario hace clic en "Indexar" manualmente
      return { success: true, name: file.name }
    } catch (err) {
      console.error("[useDocuments] uploadDocument:", err)
      await fetchAssets()
      return { success: false, name: file.name, error: String(err) }
    }
  }

  async function handleChooseFolder(folderPath: string, displayName: string) {
    try {
      const connector = await registerLocalConnector({
        project_id: DEFAULT_PROJECT_ID,
        workspace_id: WORKSPACE_ID,
        display_name: displayName,
        root_path: folderPath,
        file_filter: [".pdf", ".docx", ".doc", ".xlsx", ".csv", ".geojson", ".shp", ".dxf"],
        max_file_mb: 500,
      })

      await syncLocalConnector(connector.id)
      await fetchAssets()
      return { success: true, name: displayName, connectorId: connector.id }
    } catch (err) {
      console.error("[useDocuments] handleChooseFolder:", err)
      return { success: false, error: String(err) }
    }
  }

  async function handleIndex(assetId: string) {
    setIndexingAssetId(assetId)
    try {
      await indexDocument(assetId)
      await fetchAssets()
    } catch (err) {
      console.error("[useDocuments] handleIndex:", err)
      throw err
    } finally {
      setIndexingAssetId(null)
    }
  }

  return {
    assets,
    loading,
    indexingAssetId,
    totalChunks,
    fetchAssets,
    uploadDocument,
    handleChooseFolder,
    handleIndex,
  }
}
