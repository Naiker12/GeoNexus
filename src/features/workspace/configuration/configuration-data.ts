import {
  BellIcon,
  BrainCircuitIcon,
  DatabaseIcon,
  FolderCogIcon,
  HardDriveIcon,
  KeyboardIcon,
  LayersIcon,
  PaletteIcon,
  ServerIcon,
  ShieldIcon,
  SparklesIcon,
  WrenchIcon,
} from "lucide-react"

import type { ConfigGroup } from "@/features/workspace/configuration/configuration-types"

export const configGroups: ConfigGroup[] = [
  {
    label: "GENERAL",
    sections: [
      {
        id: "workspace",
        label: "Workspace y Entorno",
        icon: FolderCogIcon,
        indicator: null,
      },
      {
        id: "appearance",
        label: "Apariencia y Temas",
        icon: PaletteIcon,
        indicator: null,
      },
      {
        id: "keybindings",
        label: "Atajos de Teclado",
        icon: KeyboardIcon,
        indicator: null,
      },
      {
        id: "notifications",
        label: "Notificaciones",
        icon: BellIcon,
        indicator: null,
      },
    ],
  },
  {
    label: "MODELOS E IA",
    sections: [
      {
        id: "ai-embeddings",
        label: "Proveedores e IA",
        icon: BrainCircuitIcon,
        indicator: null,
      },
      {
        id: "agents",
        label: "Agentes y Permisos",
        icon: SparklesIcon,
        indicator: null,
      },
      {
        id: "mcp-router",
        label: "Protocolo MCP",
        icon: ServerIcon,
        indicator: null,
      },
    ],
  },
  {
    label: "CONEXIONES Y DATOS",
    sections: [
      {
        id: "connectors",
        label: "Conectores",
        icon: LayersIcon,
        indicator: null,
      },
      {
        id: "memory",
        label: "Memoria y Grafo RAG",
        icon: DatabaseIcon,
        indicator: null,
      },
      {
        id: "local-paths",
        label: "Rutas Locales",
        icon: HardDriveIcon,
        indicator: null,
      },
      {
        id: "allowed-paths",
        label: "Directorios Permitidos",
        icon: ShieldIcon,
        indicator: null,
      },
      {
        id: "maintenance",
        label: "Mantenimiento",
        icon: WrenchIcon,
        indicator: null,
      },
    ],
  },
]
