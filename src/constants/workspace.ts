import {
  BotIcon,
  ListTodoIcon,
  BrainIcon,
  FolderKanbanIcon,
  FileIcon,
  ServerIcon,
  MapIcon,
  CableIcon,
  BriefcaseIcon,
} from "lucide-react"
import type { NavItem, ThemePreset } from "@/types/workspace-types"

export const navigationItems: NavItem[] = [
  { title: "Chat", url: "#chat", icon: BotIcon, isActive: true },
  { title: "Tareas", url: "#tasks", icon: ListTodoIcon },
  { title: "Memoria", url: "#memory", icon: BrainIcon },
  {
    title: "Workspace",
    icon: FolderKanbanIcon,
    children: [
      { title: "Files", url: "#files", icon: FileIcon },
      { title: "MCP", url: "#mcp", icon: ServerIcon },
      { title: "Uso", url: "#uso", icon: MapIcon },
      { title: "Connectors", url: "#conectores", icon: CableIcon },
      { title: "Projects", url: "#projects", icon: BriefcaseIcon },
    ],
  },

]

export const themePresets: ThemePreset[] = [
  {
    id: "geo-dark",
    name: "Geo Dark",
    description: "Negro operativo con acento verde.",
    swatch: "bg-[#111611]",
    tone: "Operativo",
  },
  {
    id: "geo-light",
    name: "Geo Light",
    description: "Blanco oficina con acento azul oscuro.",
    swatch: "bg-[#fafafa]",
    tone: "Oficina",
  },
  {
    id: "emerald",
    name: "Emerald",
    description: "Verde esmeralda sobre fondo claro.",
    swatch: "bg-emerald-500",
    tone: "GIS",
  },
  {
    id: "cobalt",
    name: "Cobalt",
    description: "Azul cobalto de alto contraste.",
    swatch: "bg-sky-500",
    tone: "Datos",
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Negro profundo con acento cian.",
    swatch: "bg-[#07111f]",
    tone: "Nocturno",
  },
  {
    id: "lagoon",
    name: "Lagoon",
    description: "Turquesa y verdes marinos.",
    swatch: "bg-teal-500",
    tone: "Fresco",
  },
  {
    id: "graphite",
    name: "Graphite",
    description: "Gris grafito de alto contraste.",
    swatch: "bg-zinc-800",
    tone: "Pro",
  },
  {
    id: "terra",
    name: "Terra",
    description: "Tonos tierra, arcilla y marrón.",
    swatch: "bg-stone-500",
    tone: "Urbano",
  },
]
