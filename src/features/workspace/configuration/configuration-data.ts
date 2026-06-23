import {
  BellIcon,
  BrainCircuitIcon,
  DatabaseIcon,
  FolderCogIcon,
  LayersIcon,
  MapIcon,
  MessageSquareIcon,
  ServerIcon,
  Shield,
  SlidersHorizontalIcon,
  SparklesIcon,
  TerminalIcon,
  WrenchIcon,
} from "lucide-react"

import type { ConfigGroup } from "@/features/workspace/configuration/configuration-types"

export const configGroups: ConfigGroup[] = [
  {
    label: "SISTEMA",
    sections: [
      {
        id: "ai-embeddings",
        label: "IA y embeddings",
        icon: BrainCircuitIcon,
        indicator: "green",
      },
      {
        id: "mcp-router",
        label: "MCP Router",
        icon: ServerIcon,
        indicator: "yellow",
      },
    ],
  },
  {
    label: "INTEGRACIONES",
    sections: [
      {
        id: "telegram",
        label: "Telegram",
        icon: MessageSquareIcon,
        indicator: null,
      },
    ],
  },
  {
    label: "GEOESPACIAL",
    sections: [
      {
        id: "map-engines",
        label: "Motores de mapa",
        icon: MapIcon,
        indicator: null,
      },
      {
        id: "connectors",
        label: "Conectores",
        icon: LayersIcon,
        indicator: null,
      },
      {
        id: "gis-tools",
        label: "Herramientas GIS",
        icon: SlidersHorizontalIcon,
        indicator: null,
      },
    ],
  },
  {
    label: "DATOS",
    sections: [
      {
        id: "memory",
        label: "Memoria y vectores",
        icon: DatabaseIcon,
        indicator: null,
      },
      {
        id: "local-paths",
        label: "Rutas locales",
        icon: FolderCogIcon,
        indicator: null,
      },
      {
        id: "allowed-paths",
        label: "Directorios permitidos",
        icon: Shield,
        indicator: null,
      },
    ],
  },
  {
    label: "SISTEMA",
    sections: [
      {
        id: "workspace",
        label: "Workspace",
        icon: FolderCogIcon,
        indicator: null,
      },
      {
        id: "agents",
        label: "Agentes",
        icon: SparklesIcon,
        indicator: null,
      },

      {
        id: "notifications",
        label: "Notificaciones",
        icon: BellIcon,
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
