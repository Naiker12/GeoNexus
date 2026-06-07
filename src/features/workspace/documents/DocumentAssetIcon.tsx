import { FileTextIcon, FolderOpenIcon, LinkIcon, UploadCloudIcon } from "lucide-react"
import type { ComponentType } from "react"

import { cn } from "@/lib/utils"

type DocumentAssetIconProps = {
  className?: string
  kind: string
  variant?: "file" | "source"
}

const theSvgIcon = (slug: string) =>
  `https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/${slug}/default.svg`

const fileIconRoutes: Record<string, string> = {
  DOC: theSvgIcon("microsoft-word"),
  DOCX: theSvgIcon("microsoft-word"),
  EXCEL: theSvgIcon("microsoft-excel"),
  GIS: theSvgIcon("qgis"),
  PDF: theSvgIcon("pdf"),
  PPT: theSvgIcon("microsoft-powerpoint"),
  PPTX: theSvgIcon("microsoft-powerpoint"),
  XLS: theSvgIcon("microsoft-excel"),
  XLSX: theSvgIcon("microsoft-excel"),
}

const sourceIconRoutes: Record<string, string> = {
  OneDrive: theSvgIcon("microsoft-onedrive"),
  "URL / SharePoint": theSvgIcon("microsoft-sharepoint"),
}

const sourceFallbackIcons: Record<string, ComponentType<{ className?: string }>> = {
  "Carpeta Windows": FolderOpenIcon,
  "Subir archivos": UploadCloudIcon,
  "URL / SharePoint": LinkIcon,
}

export function DocumentAssetIcon({
  className,
  kind,
  variant = "file",
}: DocumentAssetIconProps) {
  const normalizedKind = kind.toUpperCase()
  const route =
    variant === "source"
      ? sourceIconRoutes[kind]
      : fileIconRoutes[normalizedKind]

  if (route) {
    return (
      <img
        alt=""
        aria-hidden="true"
        className={cn("object-contain", className)}
        src={route}
      />
    )
  }

  if (variant === "source" && sourceFallbackIcons[kind]) {
    const FallbackIcon = sourceFallbackIcons[kind]
    return <FallbackIcon className={className} />
  }

  return <FileTextIcon className={className} />
}
