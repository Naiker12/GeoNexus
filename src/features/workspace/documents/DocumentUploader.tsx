import * as React from "react"
import { RefreshCwIcon } from "lucide-react"

import { Button } from "@/components/ui/Button"
import { DocumentAssetIcon } from "@/features/workspace/documents/DocumentAssetIcon"
import { documentSources } from "@/features/workspace/documents/documents-data"

type DocumentUploaderProps = {
  onChooseFolder: () => void
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void
  uploading: boolean
}

function DocumentUploader({
  onChooseFolder,
  onFileInput,
  uploading,
}: DocumentUploaderProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleAction = (name: string) => {
    switch (name) {
      case "Carpeta Windows":
        onChooseFolder()
        break
      case "Subir archivos":
        fileInputRef.current?.click()
        break
    }
  }

  return (
    <section className="rounded-lg border border-border/80 bg-card/95 p-3 shadow-sm backdrop-blur">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Fuentes conectables</h2>
          <p className="text-xs text-muted-foreground">
            Cada fuente alimenta el mismo pipeline de extraccion, memoria y chat.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Actualizar fuentes"
          onClick={() => window.location.reload()}
        >
          <RefreshCwIcon className="size-3.5" />
        </Button>
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {documentSources.map((source) => {
          const actionLabel =
            source.name === "Carpeta Windows"
              ? "Elegir"
              : source.name === "Subir archivos"
                ? uploading ? "Subiendo..." : "Subir"
                : "Proximamente"

          return (
            <div
              key={source.name}
              className="flex min-h-24 w-full items-start gap-3 rounded-md border border-border bg-background/75 p-3 text-left"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <DocumentAssetIcon
                  kind={source.name}
                  variant="source"
                  className="size-4"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {source.name}
                </span>
                <span className="mt-1 block line-clamp-2 text-xs leading-4 text-muted-foreground">
                  {source.detail}
                </span>
                <span className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-md bg-muted px-1.5 py-0.5 text-[0.68rem] text-muted-foreground">
                    {source.status}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => handleAction(source.name)}
                    disabled={(uploading && source.name === "Subir archivos") || source.name === "URL / SharePoint"}
                  >
                    {actionLabel}
                  </Button>
                </span>
              </span>
            </div>
          )
        })}
      </div>

      <input
        ref={fileInputRef}
        className="sr-only"
        type="file"
        accept=".pdf,.doc,.docx,.txt,.zip,.dxf,.geojson,.shp,.csv,.xlsx,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff"
        multiple
        onChange={onFileInput}
      />
    </section>
  )
}

export { DocumentUploader }
export type { DocumentUploaderProps }
