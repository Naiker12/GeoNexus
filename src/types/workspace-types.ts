import type { LucideIcon } from "lucide-react"

export type NavItem = {
  title: string
  url?: string
  icon: LucideIcon
  isActive?: boolean
  children?: NavItem[]
}

export type AiConnector = {
  id: string
  name: string
  provider: "local" | "cloud" | "mcp"
  role: "chat" | "embedding" | "tool-router" | "memory"
  status: "online" | "offline" | "needs-key"
  model: string
  models: string[]
  endpoint: string
  apiKey?: string
  supportsTools: boolean
  privacy: "local" | "keychain" | "localhost"
  latency: string
  description: string
  icon: LucideIcon
}

export type GisTool = {
  name: string
  server: string
  description: string
  icon: LucideIcon
  status: "ready" | "disabled" | "needs-layer"
}

export type ThemePreset = {
  id:
    | "geo-dark"
    | "geo-light"
    | "emerald"
    | "cobalt"
    | "midnight"
    | "lagoon"
    | "graphite"
    | "terra"
  name: string
  description: string
  swatch: string
  tone: string
}
