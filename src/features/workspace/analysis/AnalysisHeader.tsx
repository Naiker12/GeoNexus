import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { BarChart3Icon, DownloadIcon, Loader2Icon } from "lucide-react"
import { toast } from "sonner"
import { toPng } from "html-to-image"
import { jsPDF } from "jspdf"
import { Button } from "@/components/ui/Button"
import { exportAnalysisTraces } from "@/api/analysis"
import type { Timeframe } from "@/types/analysis"

type ExportFormat = "csv" | "json" | "png" | "pdf"

const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  hoy: "Hoy",
  "7d": "Últimos 7 días",
  "30d": "Últimos 30 días",
}

function formatDate(): string {
  return new Date().toLocaleDateString("es-CO", { day: "numeric", month: "short" }).replace(".", "")
}

interface AnalysisHeaderProps {
  timeframe: Timeframe
}

export function AnalysisHeader({ timeframe }: AnalysisHeaderProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<ExportFormat | null>(null)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (btnRef.current?.contains(target)) return
      if (dropdownRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [open])

  async function handleExport(format: ExportFormat) {
    setOpen(false)
    setLoading(format)
    const date = new Date().toISOString().slice(0, 10)

    if (format === "csv" || format === "json") {
      const loadingToast = toast.loading(`Exportando trazas como .${format}...`, {
        description: "Preparando archivo con las trazas del proyecto",
      })
      try {
        const content = await exportAnalysisTraces("project-default", format)
        const blob = new Blob([content], { type: format === "csv" ? "text/csv" : "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `geonexus-trazas-${date}.${format}`
        a.click()
        URL.revokeObjectURL(url)
        toast.dismiss(loadingToast)
        toast.success(`Trazas exportadas — archivo .${format} descargado`)
      } catch {
        toast.dismiss(loadingToast)
        toast.error("No se pudo exportar — intenta de nuevo")
      } finally {
        setLoading(null)
      }
      return
    }

    const loadingToast = toast.loading(`Exportando reporte como .${format}...`, {
      description: "Preparando captura de la vista de análisis",
    })
    try {
      const content = document.querySelector("section.relative.z-10 > div") as HTMLElement | null
      if (!content) throw new Error("No se encontró el contenido de análisis")

      const dataUrl = await toPng(content, { quality: 0.95, pixelRatio: 2 })

      if (format === "png") {
        const a = document.createElement("a")
        a.href = dataUrl
        a.download = `geonexus-analisis-${date}.png`
        a.click()
        toast.dismiss(loadingToast)
        toast.success(`Reporte exportado — archivo .${format} descargado`)
      } else {
        toast.dismiss(loadingToast)
        const savingToast = toast.loading("Generando PDF...", {
          description: "Empaquetando captura en documento PDF",
        })
        const pdf = new jsPDF("l", "mm", "a4")
        const imgW = 297
        const imgH = (imgW * content.scrollHeight) / content.scrollWidth
        pdf.addImage(dataUrl, "PNG", 0, 0, imgW, imgH)
        const blob = pdf.output("blob")
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `geonexus-analisis-${date}.pdf`
        a.click()
        URL.revokeObjectURL(url)
        toast.dismiss(savingToast)
        toast.success("Reporte exportado — archivo .pdf descargado")
      }
    } catch (e) {
      toast.dismiss(loadingToast)
      const msg = e instanceof Error ? e.message : "Error desconocido"
      toast.error(`No se pudo exportar: ${msg}`)
    } finally {
      setLoading(null)
    }
  }

  const titleSuffix = `${TIMEFRAME_LABELS[timeframe]}, ${formatDate()}`

  return (
    <header className="overflow-hidden rounded-lg border border-border/80 bg-card/95 shadow-sm backdrop-blur">
      <div className="h-0.5 bg-[linear-gradient(90deg,var(--primary),transparent)]" />
      <div className="grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BarChart3Icon className="size-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight">Análisis · {titleSuffix}</h1>
            <p className="mt-0.5 max-w-4xl text-sm leading-5 text-muted-foreground">
              Consumo de tokens, llamadas IA, tools MCP y trazabilidad del proyecto.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button
            ref={btnRef}
            variant="outline" size="sm"
            onClick={() => {
              if (!open) {
                const r = btnRef.current?.getBoundingClientRect()
                if (r) setMenuPos({ top: r.bottom + 4, right: window.innerWidth - r.right })
              }
              setOpen((p) => !p)
            }}
            disabled={!!loading}
          >
            {loading ? <Loader2Icon className="size-4 animate-spin" /> : <DownloadIcon className="size-4" />}
            {loading ? `Exportando .${loading}...` : "Exportar"}
          </Button>
        </div>
      </div>
      {open && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-50 w-44 overflow-hidden rounded-lg border border-border bg-popover shadow-lg"
          style={{ top: menuPos.top, right: menuPos.right }}
        >
          <button
            onClick={() => handleExport("csv")}
            className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
          >
            Exportar como CSV
          </button>
          <button
            onClick={() => handleExport("json")}
            className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
          >
            Exportar como JSON
          </button>
          <div className="border-t border-border/60" />
          <button
            onClick={() => handleExport("png")}
            className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
          >
            Exportar como PNG
          </button>
          <button
            onClick={() => handleExport("pdf")}
            className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
          >
            Exportar como PDF
          </button>
        </div>,
        document.body
      )}
    </header>
  )
}
