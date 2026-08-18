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
