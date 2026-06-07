import {
  BrainCircuitIcon,
  FileTextIcon,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

export type DocumentSource = {
  name: string
  detail: string
  status: string
}

export type WorkspaceDocument = {
  name: string
  source: string
  type: string
  status: "Analizado" | "Indexando" | "Listo" | "Pendiente"
  chunks: number
  updated: string
}

export type PipelineStepItem = {
  label: string
  icon: LucideIcon
  done?: boolean
}

export const documentSources: DocumentSource[] = [
  {
    name: "OneDrive",
    detail: "Sincroniza carpetas POT, licencias y anexos tecnicos.",
    status: "Listo para conectar",
  },
  {
    name: "Carpeta Windows",
    detail: "Lee una ruta local y detecta cambios sin mover archivos.",
    status: "Local",
  },
  {
    name: "Subir archivos",
    detail: "PDF, DOCX, DXF, SHP comprimido o imagenes de campo.",
    status: "Manual",
  },
  {
    name: "URL / SharePoint",
    detail: "Registra enlaces externos para descarga controlada.",
    status: "Pendiente",
  },
]

export const documents: WorkspaceDocument[] = [
  {
    name: "GeoNexus_Arquitectura_Sistema.pdf",
    source: "Subido",
    type: "PDF",
    status: "Analizado",
    chunks: 42,
    updated: "Hoy 12:00",
  },
  {
    name: "POT Barranquilla 2024.pdf",
    source: "OneDrive",
    type: "PDF",
    status: "Indexando",
    chunks: 118,
    updated: "Hoy 10:45",
  },
  {
    name: "Anexos cartograficos.zip",
    source: "Carpeta Windows",
    type: "GIS",
    status: "Listo",
    chunks: 27,
    updated: "Ayer",
  },
  {
    name: "Resolucion uso de suelo.docx",
    source: "OneDrive",
    type: "DOCX",
    status: "Pendiente",
    chunks: 0,
    updated: "Ayer",
  },
]

export const aiFindings = [
  "Arquitectura offline-first con conectores locales, cloud y MCP.",
  "Los documentos se deben convertir en chunks versionados antes de pasar a memoria.",
  "La IA necesita citas por archivo, pagina y seccion para responder con trazabilidad.",
]

export const pipelineSteps: PipelineStepItem[] = [
  { icon: FileTextIcon, label: "Extraer texto y metadatos", done: true },
  { icon: BrainCircuitIcon, label: "Crear chunks y embeddings", done: true },
  { icon: BrainCircuitIcon, label: "Enviar contexto al chat IA" },
]
