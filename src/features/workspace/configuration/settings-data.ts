import {
  BrainCircuitIcon,
  DatabaseIcon,
  FolderCogIcon,
  KeyRoundIcon,
  MapIcon,
  ServerIcon,
  ShieldCheckIcon,
  type LucideIcon,
} from "lucide-react"

export type SettingsSection = {
  title: string
  description: string
  icon: LucideIcon
  status: "Listo" | "Revisar" | "Local" | "Seguro"
}

export const settingsSections: SettingsSection[] = [
  {
    title: "Privacidad local",
    description: "Datos, tokens y memoria bajo control del equipo.",
    icon: ShieldCheckIcon,
    status: "Seguro",
  },
  {
    title: "Proveedores IA",
    description: "Modelo activo, embeddings y API keys en keychain.",
    icon: BrainCircuitIcon,
    status: "Listo",
  },
  {
    title: "Servidores MCP",
    description: "Allowlist, ping, registry y rate limit.",
    icon: ServerIcon,
    status: "Revisar",
  },
  {
    title: "Motor de mapa",
    description: "MapLibre, ArcGIS, Leaflet o Deck.gl segun el caso.",
    icon: MapIcon,
    status: "Local",
  },
]

export const localPaths = [
  {
    label: "Workspace",
    value: "D:\\GeoNexus",
    detail: "Proyecto y configuracion local.",
  },
  {
    label: "Base de datos",
    value: "%APPDATA%\\GeoNexus\\geonexus.db",
    detail: "SQLite para proyectos, capas y registry MCP.",
  },
  {
    label: "Memoria",
    value: "%APPDATA%\\GeoNexus\\chroma",
    detail: "ChromaDB local para embeddings y contexto.",
  },
]

export const maintenanceTasks = [
  {
    title: "Migraciones SQLite",
    command: "cargo run -p geonexus-db --bin migrate",
    icon: DatabaseIcon,
  },
  {
    title: "Auditar registry MCP",
    command: "geonexus-mcp audit --localhost-only",
    icon: ServerIcon,
  },
  {
    title: "Abrir carpeta de datos",
    command: "explorer %APPDATA%\\GeoNexus",
    icon: FolderCogIcon,
  },
  {
    title: "Revisar keychain",
    command: "tauri stronghold status",
    icon: KeyRoundIcon,
  },
]
