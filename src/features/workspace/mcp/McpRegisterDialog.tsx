import { useEffect, useState } from "react"
import {
  AlertCircleIcon, CheckCircle2Icon, Loader2Icon, PlugZapIcon, RefreshCwIcon, XIcon,
} from "lucide-react"
import { Button } from "@/components/ui/Button"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { pingMcpUrl, previewMcpTools } from "@/api/mcp"
import type { PreviewTool } from "@/api/mcp"
import type { McpServer, RegisterServerPayload } from "@/types/mcp"
import { McpManualForm } from "./McpManualForm"
import { McpJsonImport } from "./McpJsonImport"
import { McpToolDiscovery } from "./McpToolDiscovery"

interface McpRegisterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRegistered: (payload: RegisterServerPayload) => Promise<void>
  editing?: McpServer | null
  prefill?: Partial<RegisterServerPayload> | null
}

const INITIAL: RegisterServerPayload = {
  id: "", name: "", url: "", transport: "http", auth_type: undefined, auth_ref: undefined, auth_token: undefined,
  command: undefined, args: undefined, env: undefined, headers: undefined, disabled: undefined,
  auto_approve: undefined, timeout_ms: undefined, tools: [],
}

export function McpRegisterDialog({ open, onOpenChange, onRegistered, editing, prefill }: McpRegisterDialogProps) {
  const [form, setForm] = useState<RegisterServerPayload>(INITIAL)
  const [toolsRaw, setToolsRaw] = useState("")
  const [configJson, setConfigJson] = useState("")
  const [fileName, setFileName] = useState<string | null>(null)
  const [status, setStatus] = useState<"idle" | "pinging" | "registering" | "done" | "error">("idle")
  const [statusMsg, setStatusMsg] = useState("")
  const [discoveredTools, setDiscoveredTools] = useState<PreviewTool[]>([])
  const [selectedToolNames, setSelectedToolNames] = useState<Set<string>>(new Set())
  const [discovering, setDiscovering] = useState(false)

  const reset = () => {
    setForm(INITIAL)
    setToolsRaw("")
    setConfigJson("")
    setFileName(null)
    setStatus("idle")
    setStatusMsg("")
    setDiscoveredTools([])
    setSelectedToolNames(new Set())
    setDiscovering(false)
  }

  useEffect(() => {
    if (editing) {
      setForm({
        id: editing.id, name: editing.name, url: editing.url, transport: editing.transport,
        auth_type: editing.auth_type, auth_ref: editing.auth_ref, auth_token: editing.auth_token,
        command: editing.command, args: editing.args, env: editing.env, headers: editing.headers,
        disabled: editing.disabled, auto_approve: editing.auto_approve, timeout_ms: editing.timeout_ms,
        tools: undefined,
      })
      setToolsRaw(""); setConfigJson(""); setDiscoveredTools([]); setSelectedToolNames(new Set())
    } else if (prefill) {
      setForm({ ...INITIAL, ...prefill })
      setToolsRaw(""); setConfigJson(""); setDiscoveredTools([]); setSelectedToolNames(new Set())
    } else {
      reset()
    }
  }, [editing, prefill, open])

  const buildPayload = (): RegisterServerPayload => ({
    ...form,
    tools: selectedToolNames.size > 0 ? Array.from(selectedToolNames) : (toolsRaw ? toolsRaw.split(",").map(t => t.trim()).filter(Boolean) : []),
  })

  const handleJsonLoad = () => {
    try {
      const parsed = JSON.parse(configJson) as Partial<RegisterServerPayload>
      setForm(prev => ({ ...prev, ...parsed }))
      if (parsed.tools) setToolsRaw((parsed.tools as string[]).join(", "))
      setStatusMsg("JSON aplicado al formulario")
    } catch {
      setStatusMsg("Error: JSON inválido")
      setStatus("error")
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setConfigJson(text)
      try {
        const parsed = JSON.parse(text) as Partial<RegisterServerPayload>
        setForm(prev => ({ ...prev, ...parsed }))
        if (parsed.tools) setToolsRaw((parsed.tools as string[]).join(", "))
        setStatusMsg(`Archivo "${file.name}" cargado y parseado`)
        setStatus("idle")
      } catch {
        setStatusMsg("Error: el archivo no es un JSON válido")
        setStatus("error")
      }
    }
    reader.readAsText(file)
  }

  const handlePing = async () => {
    if (form.transport === "stdio") {
      setStatusMsg("Servidor STDIO — no se puede hacer ping HTTP")
      setStatus("idle")
      return
    }
    if (!form.url) { setStatusMsg("Ingresa una URL primero"); setStatus("error"); return }
    setStatus("pinging")
    setStatusMsg("")
    try {
      const result = await pingMcpUrl(form.url)
      if (result.online) {
        setStatusMsg(`✓ Online · ${result.latency_ms}ms`)
        setStatus("idle")
      } else {
        setStatusMsg(`✗ Sin respuesta: ${result.error}`)
        setStatus("error")
      }
    } catch (e) {
      setStatusMsg(`Error de conexión: ${e}`)
      setStatus("error")
    }
  }

  const handleDiscoverTools = async () => {
    setDiscovering(true)
    setDiscoveredTools([])
    setSelectedToolNames(new Set())
    setStatusMsg("")
    try {
      const params: { url?: string; command?: string; args?: string[]; auth_token?: string } = {}
      if (form.transport === "http") {
        if (!form.url) { setStatusMsg("Ingresa una URL primero"); setStatus("error"); setDiscovering(false); return }
        params.url = form.url
        if (form.auth_token) params.auth_token = form.auth_token
      } else {
        if (!form.command) { setStatusMsg("Ingresa un comando primero"); setStatus("error"); setDiscovering(false); return }
        params.command = form.command
        params.args = form.args
      }
      const tools = await previewMcpTools(params)
      setDiscoveredTools(tools)
      if (tools.length === 0) {
        setStatusMsg("No se encontraron tools en el servidor")
        setStatus("error")
      } else {
        setStatusMsg(`✓ ${tools.length} tools descubiertas`)
        setStatus("idle")
      }
    } catch (e) {
      setStatusMsg(`Error: ${e instanceof Error ? e.message : String(e)}`)
      setStatus("error")
    } finally {
      setDiscovering(false)
    }
  }

  const toggleTool = (name: string) => {
    setSelectedToolNames(prev => {
      const next = new Set(prev)
      if (next.has(name)) { next.delete(name) } else { next.add(name) }
      return next
    })
  }

  const handleRegister = async () => {
    const payload = buildPayload()
    if (!payload.id && !payload.name) {
      setStatusMsg("ID o nombre requerido")
      setStatus("error")
      return
    }
    if (!payload.id) payload.id = payload.name.toLowerCase().replace(/[^a-z0-9]/g, "-")
    if (payload.transport !== "stdio" && !payload.url) { setStatusMsg("URL requerida para HTTP"); setStatus("error"); return }

    setStatus("registering")
    try {
      await onRegistered(payload)
      setStatus("done")
      setStatusMsg(`✓ Servidor "${payload.name}" registrado correctamente`)
      setTimeout(() => { onOpenChange(false); reset() }, 1200)
    } catch (err) {
      setStatus("error")
      setStatusMsg(`Error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const updateForm = (key: keyof RegisterServerPayload, value: unknown) => {
    if (key === "url" && typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed && !trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
        setForm(prev => ({ ...prev, [key]: `http://${trimmed}` }));
        return;
      }
    }
    setForm(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent className="w-[min(94vw,46rem)] rounded-lg p-0 bg-background border border-border">
        <DialogHeader className="mb-0 border-b border-border px-4 pb-3 pt-4 bg-muted/20">
          <div className="flex items-start gap-2.5 pr-8">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PlugZapIcon className="size-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold">{editing ? "Editar servidor MCP" : "Registrar servidor MCP"}</DialogTitle>
              <DialogDescription className="mt-1 text-xs leading-5">
                {editing ? "Modifica los datos del servidor existente." : "Agrega un servidor manualmente o carga un archivo JSON."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form className="grid gap-4 p-4" onSubmit={e => e.preventDefault()}>
          {statusMsg && (
            <div className={cn(
              "rounded-lg border px-3 py-2 text-xs flex items-start gap-2",
              status === "error" && "bg-destructive/10 text-destructive border-destructive/20",
              (status === "done" || status === "idle") && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
              status === "pinging" && "bg-primary/5 text-primary border-primary/15",
            )}>
              {status === "pinging" ? <Loader2Icon className="size-3.5 animate-spin shrink-0 mt-0.5" /> :
               status === "error" ? <AlertCircleIcon className="size-3.5 shrink-0 mt-0.5" /> :
               <CheckCircle2Icon className="size-3.5 shrink-0 mt-0.5" />}
              <span>{statusMsg}</span>
              <button type="button" onClick={() => setStatusMsg("")} className="ml-auto shrink-0">
                <XIcon className="size-3.5" />
              </button>
            </div>
          )}

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="grid gap-3">
              <McpManualForm form={form} updateForm={updateForm} />
              <McpToolDiscovery
                toolsRaw={toolsRaw}
                onToolsRawChange={setToolsRaw}
                discoveredTools={discoveredTools}
                selectedToolNames={selectedToolNames}
                discovering={discovering}
                onDiscover={handleDiscoverTools}
                onToggleTool={toggleTool}
              />
            </div>
            <McpJsonImport
              configJson={configJson}
              fileName={fileName}
              onConfigChange={setConfigJson}
              onFileSelect={handleFileChange}
              onApplyJson={handleJsonLoad}
            />
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-3 sm:flex-row sm:justify-between">
            <Button variant="outline" size="sm" type="button" className="h-8 text-xs"
              onClick={handlePing} disabled={status === "pinging" || !form.url}>
              <RefreshCwIcon className={cn("mr-1.5 size-3.5", status === "pinging" && "animate-spin")} />
              Probar ping / validar
            </Button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button variant="outline" size="sm" type="button" className="h-8 text-xs"
                onClick={() => onOpenChange(false)} disabled={status === "registering"}>
                Cancelar
              </Button>
              <Button size="sm" type="button" className="h-8 text-xs px-3 bg-primary hover:bg-primary/90"
                onClick={handleRegister} disabled={status === "registering"}>
                <PlugZapIcon className="mr-1.5 size-3.5" />
                {status === "registering" ? "Guardando..." : editing ? "Guardar cambios" : "Agregar MCP"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
