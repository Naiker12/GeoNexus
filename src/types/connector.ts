export type ConnectorProvider =
  | "local"
  | "onedrive"
  | "sharepoint"
  | "google_drive"
  | "dropbox"
  | "s3"

export type FileSyncStatus = "pending" | "synced" | "conflict" | "ignored"

export interface ConnectorConfig {
  id: string
  project_id: string
  workspace_id: string | null
  provider: ConnectorProvider
  display_name: string
  root_path: string | null
  qgis_project_path: string | null
  base_url: string | null
  client_id: string | null
  tenant_id: string | null
  sync_folders: string[]
  file_filter: string[]
  max_file_mb: number
  is_active: boolean
  last_synced: number | null
  created_at: number
  updated_at: number
}

export interface ConnectorFile {
  id: string
  connector_id: string
  name: string
  path: string
  local_path: string | null
  size_bytes: number | null
  mime_type: string | null
  modified_remote: number | null
  modified_local: number | null
  sync_status: FileSyncStatus
  etag: string | null
  created_at: number
}

export interface SyncReport {
  connector_id: string
  discovered: number
  downloaded: number
  skipped: number
  conflicts: number
  errors: string[]
  duration_ms: number
}

export interface RegisterLocalConnectorInput {
  project_id: string
  workspace_id: string | null
  display_name: string
  root_path: string
  file_filter: string[]
  max_file_mb: number | null
}
