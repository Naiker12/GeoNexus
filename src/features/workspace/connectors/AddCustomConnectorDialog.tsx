import * as React from "react"
import { FolderOpenIcon, PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/Button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/Input"
import { NativeSelect } from "@/components/ui/native-select"
import { Field, CheckRow } from "@/features/workspace/configuration/settings-ui"
import { registerLocalConnector, syncLocalConnector } from "@/api/connector"
import { invoke } from "@tauri-apps/api/core"

const FORMAT_OPTIONS = [
  { value: "shp", label: ".shp (Shapefile)" },
  { value: "geojson", label: ".geojson" },
  { value: "pdf", label: ".pdf" },
  { value: "docx", label: ".docx / .doc" },
  { value: "xlsx", label: ".xlsx / .csv" },
  { value: "dxf", label: ".dxf" },
  { value: "gdb", label: ".gdb (Geodatabase)" },
  { value: "gpkg", label: ".gpkg (GeoPackage)" },
  { value: "qgz", label: ".qgz / .qgs (QGIS)" },
  { value: "tif", label: ".tif / .tiff (Raster)" },
]

type ConnectorType = "local_folder" | "api_rest" | "url"

type AddCustomConnectorDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddCustomConnectorDialog({
  open,
  onOpenChange,
}: AddCustomConnectorDialogProps) {
  const [name, setName] = React.useState("")
  const [type, setType] = React.useState<ConnectorType>("local_folder")
  const [path, setPath] = React.useState("")
  const [auth, setAuth] = React.useState("none")
  const [formats, setFormats] = React.useState<string[]>(["shp", "geojson", "pdf"])
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!open) {
      setName("")
      setType("local_folder")
      setPath("")
      setAuth("none")
      setFormats(["shp", "geojson", "pdf"])
    }
  }, [open])

  const toggleFormat = (fmt: string) => {
    setFormats((prev) =>
      prev.includes(fmt) ? prev.filter((f) => f !== fmt) : [...prev, fmt]
    )
  }

  const handleBrowse = async () => {
    try {
      const folder = await invoke<string | null>("open_folder_picker")
      if (folder) {
        setPath(folder)
        if (!name) {
          const folderName = folder.split("\\").pop()?.split("/").pop() ?? ""
          setName(folderName)
        }
      }
    } catch {
      // Fallback: let user type path manually
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !path.trim()) return

    setSaving(true)
    try {
      const connector = await registerLocalConnector({
        project_id: "project-default",
        workspace_id: "workspace-main",
        display_name: name.trim(),
        root_path: path.trim(),
        file_filter: formats.map((f) => `.${f}`),
        max_file_mb: 500,
      })

      await syncLocalConnector(connector.id)
      onOpenChange(false)
    } catch (err) {
      console.error("[AddCustomConnectorDialog] Error:", err)
      alert(`Error al crear conector: ${err}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(94vw,42rem)] rounded-lg p-0">
        <DialogHeader className="mb-0 border-b border-border px-4 pb-3 pt-4">
          <div className="flex items-start gap-2.5 pr-8">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PlusIcon className="size-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base">
                Agregar conector personalizado
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm leading-5">
                Registra una fuente de datos local, API REST externa o URL.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form className="grid gap-4 p-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre del conector">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mi carpeta GIS"
                required
              />
            </Field>
            <Field label="Tipo de fuente">
              <NativeSelect
                value={type}
                onChange={(e) => setType(e.target.value as ConnectorType)}
              >
                <option value="local_folder">Carpeta local / red</option>
                <option value="api_rest">API REST externa</option>
                <option value="url">URL / SharePoint</option>
              </NativeSelect>
            </Field>
          </div>

          <Field label={type === "local_folder" ? "Ruta de carpeta" : "URL o endpoint"}>
            <div className="flex gap-2">
              <Input
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder={
                  type === "local_folder"
                    ? "C:\\Users\\...\\GIS"
                    : "https://ejemplo.com/api"
                }
                required
                className="flex-1"
              />
              {type === "local_folder" && (
                <Button
                  variant="outline"
                  size="icon"
                  type="button"
                  onClick={handleBrowse}
                  aria-label="Examinar carpeta"
                >
                  <FolderOpenIcon className="size-4" />
                </Button>
              )}
            </div>
          </Field>

          <Field label="Autenticacion">
            <NativeSelect
              value={auth}
              onChange={(e) => setAuth(e.target.value)}
            >
              <option value="none">Ninguna</option>
              <option value="api-key">API Key</option>
              <option value="oauth">OAuth 2.0</option>
              <option value="basic">Basic Auth</option>
            </NativeSelect>
          </Field>

          <div className="rounded-lg border border-border bg-background/75 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
              Formatos a indexar
            </p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {FORMAT_OPTIONS.map((fmt) => (
                <CheckRow
                  key={fmt.value}
                  label={fmt.label}
                  checked={formats.includes(fmt.value)}
                  onCheckedChange={() => toggleFormat(fmt.value)}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-3 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button size="sm" type="submit" disabled={saving || !name.trim() || !path.trim()}>
              {saving ? "Guardando..." : "Agregar conector"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
