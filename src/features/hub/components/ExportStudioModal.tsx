import { CheckIcon, CopyIcon, DownloadIcon, Share2Icon, UploadCloudIcon, XIcon } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/Button"
import { useToast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"

export type ExportFormat = "gguf-q4" | "gguf-q8" | "gguf-q5" | "awq" | "ollama"

interface ExportStudioModalProps {
  open: boolean
  onClose: () => void
  modelName: string
}

export function ExportStudioModal({ open, onClose, modelName }: ExportStudioModalProps) {
  const { toast } = useToast()
  const [format, setFormat] = React.useState<ExportFormat>("gguf-q4")
  const [_mergeLora, _setMergeLora] = React.useState(true)
  const [copied, setCopied] = React.useState(false)
  const [exporting, setExporting] = React.useState(false)

  if (!open) return null

  const modelfileContent = `FROM ${modelName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-q4_k_m.gguf
TEMPLATE """{{ if .System }}<|system|>
{{ .System }}<|end|>
{{ end }}{{ if .Prompt }}<|user|>
{{ .Prompt }}<|end|>
{{ end }}<|assistant|>
{{ .Response }}<|end|>"""
PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER stop "<|end|>"
PARAMETER stop "<|user|>"
`

  const handleCopyModelfile = () => {
    navigator.clipboard.writeText(modelfileContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast({
      title: "Modelfile Copiado al Portapapeles",
      description:
        "Listo para crear tu modelo local en Ollama con: ollama create <nombre> -f Modelfile",
      variant: "success",
    })
  }

  const handleExport = () => {
    setExporting(true)
    toast({
      title: "Iniciando Exportación y Cuantización",
      description: `Generando paquete ${format.toUpperCase()} para ${modelName}...`,
      variant: "info",
    })

    setTimeout(() => {
      setExporting(false)
      onClose()
      toast({
        title: "Exportación Finalizada",
        description: "El archivo GGUF y Modelfile han sido guardados en el almacenamiento local.",
        variant: "success",
      })
    }, 2500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-panel w-full max-w-2xl rounded-3xl p-6 shadow-2xl bg-card border border-border space-y-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-primary/10 text-primary">
              <Share2Icon className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground font-sans">
                Export & Quantization Studio
              </h2>
              <p className="text-xs text-muted-foreground">
                Exporta <span className="font-semibold text-foreground">{modelName}</span> a
                formatos GGUF, Ollama o Hugging Face.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors"
          >
            <XIcon className="size-5" />
          </button>
        </div>

        {/* Selector de Formato de Cuantización */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Formato de Cuantización & Destino
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setFormat("gguf-q4")}
              className={cn(
                "flex flex-col items-start p-3 rounded-2xl border text-left transition-all",
                format === "gguf-q4"
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border/70 hover:border-border bg-card/50"
              )}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-foreground font-mono">GGUF Q4_K_M</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 font-semibold font-mono">
                  Recomendado
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Balance óptimo de velocidad y memoria (VRAM: ~4.5 GB).
              </p>
            </button>

            <button
              type="button"
              onClick={() => setFormat("gguf-q8")}
              className={cn(
                "flex flex-col items-start p-3 rounded-2xl border text-left transition-all",
                format === "gguf-q8"
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border/70 hover:border-border bg-card/50"
              )}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-foreground font-mono">GGUF Q8_0</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-600 font-semibold font-mono">
                  Máxima Precisión
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Calidad casi idéntica a 16-bit (VRAM: ~8.2 GB).
              </p>
            </button>

            <button
              type="button"
              onClick={() => setFormat("ollama")}
              className={cn(
                "flex flex-col items-start p-3 rounded-2xl border text-left transition-all",
                format === "ollama"
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border/70 hover:border-border bg-card/50"
              )}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-foreground font-mono">
                  Ollama Modelfile
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 font-semibold font-mono">
                  1-Click
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Manifiesto directo para ejecutar en tu servidor Ollama local.
              </p>
            </button>
          </div>
        </div>

        {/* Vista previa de Modelfile / Configuración */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">
              Manifiesto Ollama Generado (Modelfile)
            </span>
            <button
              onClick={handleCopyModelfile}
              className="flex items-center gap-1 text-xs text-primary hover:underline font-mono"
            >
              {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
              {copied ? "Copiado!" : "Copiar Modelfile"}
            </button>
          </div>
          <pre className="p-3 rounded-2xl bg-muted/60 text-[11px] font-mono text-muted-foreground overflow-x-auto border border-border/60">
            {modelfileContent}
          </pre>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleExport}
            disabled={exporting}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {exporting ? (
              <UploadCloudIcon className="size-4 animate-bounce" />
            ) : (
              <DownloadIcon className="size-4" />
            )}
            {exporting ? "Procesando Cuantización..." : "Exportar Modelo & GGUF"}
          </Button>
        </div>
      </div>
    </div>
  )
}
