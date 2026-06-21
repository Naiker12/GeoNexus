import {
  DatabaseIcon,
  FolderCogIcon,
  KeyRoundIcon,
  RefreshCwIcon,
  FileTextIcon,
  FileJsonIcon,
  RotateCcwIcon,
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

export interface MaintenanceTask {
  id: string
  title: string
  description: string
  command: string
  icon: React.FC<{ className?: string }>
  tauriCommand?: string
  destructive?: boolean
}

export const maintenanceTasks: MaintenanceTask[] = [
  {
    id: "sqlite-migrations",
    title: "Migraciones SQLite",
    description: "Ejecuta migraciones pendientes de la base de datos",
    command: "cargo run -p geonexus-db --bin migrate",
    icon: DatabaseIcon,
    tauriCommand: "run_sqlite_migrations",
  },
  {
    id: "audit-mcp",
    title: "Auditar registry MCP",
    description: "Verifica integridad de los servidores MCP registrados",
    command: "geonexus-mcp audit --localhost-only",
    icon: ServerIcon,
    tauriCommand: "audit_mcp_registry",
  },
  {
    id: "open-data-folder",
    title: "Abrir carpeta de datos",
    description: "Abre el directorio de datos de GeoNexus en el explorador",
    command: "explorer %APPDATA%\\GeoNexus",
    icon: FolderCogIcon,
    tauriCommand: "open_data_folder",
  },
  {
    id: "keychain-status",
    title: "Revisar keychain",
    description: "Verifica el estado del almacén seguro de claves",
    command: "tauri stronghold status",
    icon: KeyRoundIcon,
    tauriCommand: "check_keychain_status",
  },
  {
    id: "reindex-chroma",
    title: "Re-indexar Chroma",
    description: "Reconstruye los índices vectoriales de ChromaDB",
    command: "",
    icon: RefreshCwIcon,
    tauriCommand: "reindex_chroma_collections",
  },
  {
    id: "export-traces-csv",
    title: "Exportar trazas CSV",
    description: "Exporta el historial de análisis y trazas como archivo CSV",
    command: "",
    icon: FileTextIcon,
    tauriCommand: "export_traces_as_csv",
  },
  {
    id: "export-traces-json",
    title: "Exportar trazas JSON",
    description: "Exporta el historial de análisis y trazas como archivo JSON",
    command: "",
    icon: FileJsonIcon,
    tauriCommand: "export_traces_as_json",
  },
  {
    id: "reset-analytics",
    title: "Reset analytics",
    description: "Elimina todos los datos de analítica y estadísticas de uso",
    command: "",
    icon: RotateCcwIcon,
    tauriCommand: "reset_analytics",
    destructive: true,
  },
]
