import { useEffect, useState } from "react"
import { BracesIcon, CheckCircle2Icon, CopyIcon, FileUpIcon, Loader2Icon, ServerIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { importMcpConfig, exportMcpConfig } from "@/api/mcp"
import { GEONEXUS_MCP_TEMPLATE, MCP_SERVER_TEMPLATES } from "@/features/workspace/mcp/mcp-templates"
import type { ImportResult } from "@/types/mcp"

interface McpConfigEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: () => void
}

type EditorMode = "import" | "export" | "template"

const PLACEHOLDER_JSON = `{\n  "mcpServers": {\n    "mi-servidor": {\n      "command": "npx",\n      "args": ["-y", "paquete-mcp"]\n    }\n  }\n}`

export function McpConfigEditor({ open, onOpenChange, onImported }: McpConfigEditorProps) {
  const [mode, setMode] = useState<EditorMode>("import")
  const [jsonText, setJsonText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) {
      setMode("import")
      setJsonText("")
      setError(null)
      setResult(null)
      setCopied(false)
    }
  }, [open])

  useEffect(() => {
    if (open && mode === "template") {
      setJsonText(GEONEXUS_MCP_TEMPLATE)
      validateJson(GEONEXUS_MCP_TEMPLATE)
    }
  }, [open, mode])

  const validateJson = (text: string) => {
    if (!text.trim()) { setError(null); return }
    try {
      const parsed = JSON.parse(text)
      if (!parsed.mcpServers || typeof parsed.mcpServers !== "object") {
        setError('Falta la clave "mcpServers" en el JSON')
      } else {
        setError(null)
      }
    } catch (e) {
      setError(`JSON inválido: ${(e as Error).message}`)
    }
  }

  const handleJsonChange = (text: string) => {
    setJsonText(text)
    validateJson(text)
  }

  const handleExport = async () => {
    try {
      const config = await exportMcpConfig()
      setJsonText(config)
      setMode("export")
      setError(null)
    } catch (e) {
      setError(String(e))
    }
  }

  const handleImport = async () => {
    if (error || !jsonText.trim()) return
    setImporting(true)
    setResult(null)
    try {
      const res = await importMcpConfig(jsonText)
      setResult(res)
      if (res.errors.length === 0) {
        onImported()
        setTimeout(() => onOpenChange(false), 1500)
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setImporting(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  const appendTemplate = (key: string) => {
    const tmpl = MCP_SERVER_TEMPLATES[key]
    if (!tmpl) return
    try {
      const current = jsonText.trim() ? JSON.parse(jsonText) : { mcpServers: {} }
      if (!current.mcpServers) current.mcpServers = {}
      current.mcpServers[`${key}-mcp`] = tmpl
      const updated = JSON.stringify(current, null, 2)
      setJsonText(updated)
      validateJson(updated)
    } catch { /* ignore */ }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onOpenChange(false) }}>
      <DialogContent className="w-[min(94vw,52rem)] rounded-lg p-0 bg-background border border-border">
        <DialogHeader className="mb-0 border-b border-border px-4 pb-3 pt-4 bg-muted/20">
          <div className="flex items-start gap-2.5 pr-8">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ServerIcon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-semibold">Configuración MCP</DialogTitle>
              <DialogDescription className="mt-1 text-xs leading-5">
                Importa o exporta servidores en formato JSON compatible con Claude Desktop
              </DialogDescription>
              <div className="mt-2 flex gap-1.5">
                {(["import", "export", "template"] as const).map((t) => (
                  <button key={t}
                    onClick={t === "export" ? handleExport : () => { setMode(t); if (t === "template") setJsonText(GEONEXUS_MCP_TEMPLATE) }}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-[11px] font-medium transition",
                      mode === t
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {t === "import" ? "Importar" : t === "export" ? "Exportar" : "Template"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-3 p-4">
          {/* Status messages */}
          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive flex items-start gap-2">
              <XIcon className="size-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
              <button type="button" onClick={() => setError(null)} className="ml-auto shrink-0">
                <XIcon className="size-3.5" />
              </button>
            </div>
          )}
          {result && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2Icon className="size-3.5" />
                {result.imported} servidores importados
              </span>
              {result.skipped > 0 && (
                <span className="text-muted-foreground">↷ {result.skipped} ya existían (omitidos)</span>
              )}
              {result.errors.map((e, i) => (
                <span key={i} className="text-destructive">✗ {e}</span>
              ))}
            </div>
          )}

          <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
            {/* JSON Editor */}
            <div className="relative">
              <textarea
                value={jsonText}
                onChange={e => handleJsonChange(e.target.value)}
                placeholder={PLACEHOLDER_JSON}
                spellCheck={false}
                rows={22}
                className={cn(
                  "w-full rounded-lg border bg-card/40 p-3 font-mono text-[11px] leading-relaxed resize-none focus:outline-none focus:ring-1",
                  error ? "border-destructive/50 focus:ring-destructive/50" : "border-border/60 focus:ring-primary/50"
                )}
              />
            </div>

            {/* Quick actions sidebar */}
            <div className="flex flex-col gap-2 lg:w-36">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">Ejemplos rápidos</span>
              {Object.keys(MCP_SERVER_TEMPLATES).map((key) => (
                <button key={key}
                  onClick={() => appendTemplate(key)}
                  className="h-6 rounded-md border border-border/60 bg-muted/30 px-2 text-[10px] text-muted-foreground hover:bg-muted/60 text-left truncate"
                >
                  + {key}
                </button>
              ))}
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex flex-col-reverse gap-2 border-t border-border pt-3 sm:flex-row sm:justify-between">
            <Button variant="outline" size="sm" type="button" className="h-7 text-xs"
              onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              {mode === "export" && (
                <Button variant="outline" size="sm" type="button" className="h-7 text-xs"
                  onClick={handleCopy}>
                  <CopyIcon className="mr-1.5 size-3.5" />
                  {copied ? "Copiado" : "Copiar al portapapeles"}
                </Button>
              )}
              {mode === "import" && (
                <Button size="sm" type="button" className="h-7 text-xs px-3 bg-primary hover:bg-primary/90"
                  onClick={handleImport} disabled={!!error || !jsonText.trim() || importing}>
                  {importing ? <Loader2Icon className="mr-1.5 size-3.5 animate-spin" /> : <FileUpIcon className="mr-1.5 size-3.5" />}
                  {importing ? "Importando..." : "Importar servidores"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
