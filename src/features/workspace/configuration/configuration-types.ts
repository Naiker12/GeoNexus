import type { LucideIcon } from "lucide-react"

export type ConfigSectionId =
  | "ai-embeddings"
  | "mcp-router"
  | "telegram"
  | "map-engines"
  | "connectors"
  | "memory"
  | "local-paths"
  | "gis-tools"
  | "commands"
  | "maintenance"
  | "agents"

export type ConfigSection = {
  id: ConfigSectionId
  label: string
  icon: LucideIcon
  indicator?: "green" | "yellow" | null
}

export type ConfigGroup = {
  label: string
  sections: ConfigSection[]
}
