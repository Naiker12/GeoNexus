import type { LucideIcon } from "lucide-react"

export type ConfigSectionId =
  | "workspace"
  | "appearance"
  | "keybindings"
  | "notifications"
  | "ai-embeddings"
  | "agents"
  | "mcp-router"
  | "connectors"
  | "memory"
  | "local-paths"
  | "allowed-paths"
  | "maintenance"
  | "telegram"

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
