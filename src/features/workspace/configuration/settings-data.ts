import {
  DatabaseIcon,
  FolderCogIcon,
  KeyRoundIcon,
  ServerIcon,
} from "lucide-react"

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
