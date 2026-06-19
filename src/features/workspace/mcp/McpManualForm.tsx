import { KeyRoundIcon } from "lucide-react"
import { Input } from "@/components/ui/Input"
import type { RegisterServerPayload } from "@/types/mcp"

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

interface McpManualFormProps {
  form: RegisterServerPayload
  updateForm: (key: keyof RegisterServerPayload, value: unknown) => void
}

export function McpManualForm({ form, updateForm }: McpManualFormProps) {
  return (
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
      {(form.url ?? "").toLowerCase().includes("supabase.com/mcp") && (
        <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/50 px-3 py-2.5 text-xs">
          <p className="font-semibold text-green-800 dark:text-green-300 mb-1">Supabase requiere autenticación</p>
          <ol className="list-decimal list-inside text-green-700 dark:text-green-400 space-y-0.5">
            <li>Ve a <a href="https://supabase.com/dashboard/account/tokens" target="_blank" rel="noopener noreferrer" className="underline font-medium">supabase.com/dashboard/account/tokens</a></li>
            <li>Genera un <strong>Personal Access Token</strong></li>
            <li>Pégalo en <strong>Token de autenticación</strong> arriba</li>
          </ol>
          <p className="mt-1.5 text-green-600 dark:text-green-500">URL correcta: <code className="text-[10px] bg-green-100 dark:bg-green-900/50 px-1 rounded">https://mcp.supabase.com/mcp</code></p>
        </div>
      )}
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
  )
}
