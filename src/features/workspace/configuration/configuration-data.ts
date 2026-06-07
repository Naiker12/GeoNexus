import {
  BrainCircuitIcon,
  DatabaseIcon,
  FolderCogIcon,
  LayersIcon,
  MapIcon,
  ServerIcon,
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
    ],
  },
  {
    label: "SISTEMA",
    sections: [
      {
        id: "maintenance",
        label: "Mantenimiento",
        icon: WrenchIcon,
        indicator: null,
      },
    ],
  },
]
