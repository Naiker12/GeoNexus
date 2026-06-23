import type { ComponentType } from "react"

export type ConnectorProviderId =
  | "onedrive"
  | "sharepoint"
  | "google-drive"
  | "dropbox"
  | "local"
  | "arcgis-pro"
  | "api-rest"
  | "s3"

export type ConnectorProviderInfo = {
  id: ConnectorProviderId
  name: string
  kind:
    | "Microsoft Graph"
    | "OAuth"
    | "Local"
    | "External API"
    | "Object storage"
  status: "connected" | "disconnected"
  phase: "V1" | "V2" | "V3"
  auth: string
  scope: string
  endpoint: string
  description: string
  accent: string
  formats: string[]
  permissions: string[]
  mcpServer: string
  tools: string[]
  indexTargets: string[]
  svglRoute?: string
  fallbackIcon?: ComponentType<{ className?: string }>
}
