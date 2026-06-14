import { useState } from "react"
import {
  AlertCircleIcon, BracesIcon, CheckCircle2Icon, FileUpIcon,
  KeyRoundIcon, Loader2Icon, PlugZapIcon, RefreshCwIcon, XIcon,
} from "lucide-react"
import { Button } from "@/components/ui/Button"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/Input"
import { Textarea } from "@/components/ui/Textarea"
import { cn } from "@/lib/utils"
import { pingMcpServer } from "@/api/mcp"
import type { RegisterServerPayload } from "@/types/mcp"

/** Tokeniza una línea de comandos respetando comillas dobles y simples. */
function tokenizeArgs(input: string): string[] {
  const args: string[] = []
  let current = ""
  let inSingle = false
  let inDouble = false
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (ch === "'" && !inDouble) { inSingle = !inSingle; continue }
    if (ch === '"' && !inSingle) { inDouble = !inDouble; continue }
    if (ch === "\\" && i + 1 < input.length && (input[i + 1] === '"' || input[i + 1] === "'" || input[i + 1] === "\\")) {
      current += input[++i]; continue
    }
    if (/\s/.test(ch) && !inSingle && !inDouble) {
      if (current) { args.push(current); current = "" }
      continue
    }
    current += ch
  }
  if (current) args.push(current)
  return args
}

interface McpRegisterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRegistered: (payload: RegisterServerPayload) => Promise<void>
}

const INITIAL: RegisterServerPayload = {
  id: "", name: "", url: "", transport: "http", auth_type: undefined, auth_ref: undefined, auth_token: undefined,
  command: undefined, args: undefined, env: undefined, headers: undefined, disabled: undefined,
  auto_approve: undefined, timeout_ms: undefined, tools: [],
}

export function McpRegisterDialog({ open, onOpenChange, onRegistered }: McpRegisterDialogProps) {
  const [form, setForm] = useState<RegisterServerPayload>(INITIAL)
  const [toolsRaw, setToolsRaw] = useState("")
  const [configJson, setConfigJson] = useState("")
  const [fileName, setFileName] = useState<string | null>(null)
  const [status, setStatus] = useState<"idle" | "pinging" | "registering" | "done" | "error">("idle")
  const [statusMsg, setStatusMsg] = useState("")

  const reset = () => {
    setForm(INITIAL)
    setToolsRaw("")
    setConfigJson("")
    setFileName(null)
    setStatus("idle")
    setStatusMsg("")
  }

  const buildPayload = (): RegisterServerPayload => ({
    ...form,
    tools: toolsRaw ? toolsRaw.split(",").map(t => t.trim()).filter(Boolean) : [],
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
      const result = await pingMcpServer(form.id || "temp-ping")
      if (result.online) {
        setStatusMsg(`✓ Online · ${result.latency_ms}ms`)
        setStatus("idle")
      } else {
        setStatusMsg(`✗ Sin respuesta: ${result.error}`)
        setStatus("error")
      }
    } catch {
      setStatusMsg("Probando conexión directa... (el ping real requiere servidor registrado)")
      setStatus("idle")
    }
  }

  const handleRegister = async () => {
    const payload = buildPayload()
    if (!payload.id && !payload.name) {
      setStatusMsg("ID o nombre requerido")
      setStatus("error")
      return
    }
    if (!payload.id) payload.id = payload.name.toLowerCase().replace(/[^a-z0-9]/g, "-")
    if (!payload.url) { setStatusMsg("URL requerida"); setStatus("error"); return }

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

  const updateForm = (key: keyof RegisterServerPayload, value: unknown) =>
    setForm(prev => ({ ...prev, [key]: value || undefined }))

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent className="w-[min(94vw,46rem)] rounded-lg p-0 bg-background border border-border">
        <DialogHeader className="mb-0 border-b border-border px-4 pb-3 pt-4 bg-muted/20">
          <div className="flex items-start gap-2.5 pr-8">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PlugZapIcon className="size-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold">Registrar servidor MCP</DialogTitle>
              <DialogDescription className="mt-1 text-xs leading-5">
                Agrega un servidor manualmente o carga un archivo JSON. Se persiste en SQLite vía Tauri.
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
            <section className="grid gap-2.5 rounded-lg border border-border/80 bg-card/40 p-3 shadow-inner">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <KeyRoundIcon className="size-3.5 text-primary" />
                Registro manual
              </div>
              <FormInput label="ID único" placeholder="qgis-mcp" value={form.id ?? ""} onChange={v => updateForm("id", v)} />
              <FormInput label="Nombre" placeholder="QGIS MCP" value={form.name ?? ""} onChange={v => updateForm("name", v)} />
              <div className="flex gap-2">
                <select
                  className="h-7 rounded-md border border-border/60 bg-background/50 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  value={form.transport ?? "http"}
                  onChange={e => updateForm("transport", e.target.value)}
                >
                  <option value="http">HTTP</option>
                  <option value="stdio">STDIO</option>
                </select>
                <div className="flex-1">
                  {form.transport === "http" ? (
                    <FormInput label="URL" placeholder="localhost:3001 o https://..." value={form.url ?? ""} onChange={v => updateForm("url", v)} />
                  ) : (
                    <FormInput label="Comando" placeholder="npx, python, node..." value={form.command ?? ""} onChange={v => updateForm("command", v)} />
                  )}
                </div>
              </div>
              {form.transport === "stdio" && (
                <FormInput label="Args (separados por espacio)" placeholder="-y @modelcontextprotocol/server-memory" value={form.args?.join(" ") ?? ""} onChange={v => updateForm("args", v ? tokenizeArgs(v) : undefined)} />
              )}
              <FormInput label="Auth ref (opcional)" placeholder="oauth:auto o env:MCP_TOKEN" value={form.auth_ref ?? ""} onChange={v => updateForm("auth_ref", v)} />
              <FormInputPassword label="Token de autenticación (opcional)" placeholder="sbp_xxxx o api_key" value={form.auth_token ?? ""} onChange={v => updateForm("auth_token", v)} />
              <FormInput label="Tools (opcional, coma separada)" placeholder="buffer, distance, load_layer" value={toolsRaw} onChange={setToolsRaw} />
              <details className="rounded-md border border-border/60 bg-muted/30 px-2.5 py-1.5">
                <summary className="cursor-pointer text-[10px] font-semibold text-muted-foreground">
                  Cómo iniciar servidores locales
                </summary>
                <div className="mt-1.5 space-y-1.5 text-[10px] text-muted-foreground">
                  <p><strong>Memory MCP</strong>: <code className="text-primary">npx @modelcontextprotocol/server-memory --port 3001</code></p>
                  <p><strong>QGIS MCP</strong>: <code className="text-primary">pip install mcp-proxy && mcp-proxy --port 3002 -- python -m qgis_mcp</code></p>
                  <p><strong>Supabase</strong>: genera PAT en <code className="text-primary">supabase.com/dashboard/account/tokens</code> y pégalo en "Token de autenticación"</p>
                </div>
              </details>
            </section>

            <section className="grid gap-2 rounded-lg border border-border/80 bg-card/40 p-3 shadow-inner">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span className="flex items-center gap-2">
                  <BracesIcon className="size-3.5 text-primary" />
                  Config por código (JSON)
                </span>
                {fileName && <span className="truncate max-w-[120px] text-[10px] text-emerald-500 font-normal normal-case">{fileName}</span>}
              </div>
              <Textarea
                rows={9}
                className="min-h-48 font-mono text-[11px] leading-relaxed bg-background/50 border-border/60"
                value={configJson}
                onChange={e => setConfigJson(e.target.value)}
                placeholder='{"id": "mi-mcp", "name": "Mi MCP", "url": "localhost:7031"}'
              />
              <Button variant="outline" size="sm" className="h-8 text-xs cursor-pointer" asChild>
                <label className="flex items-center justify-center gap-1.5 w-full">
                  <FileUpIcon className="size-3.5" />
                  Seleccionar archivo config
                  <input className="sr-only" type="file" accept=".json,.yaml,.yml,.toml" onChange={handleFileChange} />
                </label>
              </Button>
              {configJson && (
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={handleJsonLoad}>
                  Aplicar JSON al formulario
                </Button>
              )}
            </section>
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
                {status === "registering" ? "Registrando..." : "Agregar MCP"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function FormInput({ label, placeholder, value, onChange }: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void
}) {
  return (
    <label className="grid gap-1 text-[11px] font-semibold text-muted-foreground">
      {label}
      <Input placeholder={placeholder} className="h-7 text-xs bg-background/50 border-border/60 placeholder:text-muted-foreground/50"
        value={value} onChange={e => onChange(e.target.value)} />
    </label>
  )
}

function FormInputPassword({ label, placeholder, value, onChange }: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void
}) {
  return (
    <label className="grid gap-1 text-[11px] font-semibold text-muted-foreground">
      {label}
      <input type="password" placeholder={placeholder}
        className="h-7 w-full rounded-md border border-border/60 bg-background/50 px-2.5 text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
        value={value} onChange={e => onChange(e.target.value)} />
      <span className="text-[10px] font-normal text-muted-foreground/70">
        Supabase: genera un PAT en supabase.com/dashboard/account/tokens
      </span>
    </label>
  )
}
