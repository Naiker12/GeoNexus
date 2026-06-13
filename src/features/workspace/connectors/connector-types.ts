import type { ComponentType } from "react"

export type ConnectorProviderId =
  | "onedrive"
  | "sharepoint"
  | "google-drive"
  | "dropbox"
  | "local"
  | "qgis"
  | "arcgis-pro"
  | "api-rest"
  | "s3"

export type ConnectorProvider = {
  id: ConnectorProviderId
  name: string
  kind:
    | "Microsoft Graph"
    | "OAuth"
    | "Local"
    | "GIS desktop"
    | "External API"
    | "Object storage"
  status: "simulated" | "planned" | "connected"
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
  actionLabel: string
  indexTargets: string[]
  svglRoute?: string
  fallbackIcon?: ComponentType<{ className?: string }>
}
