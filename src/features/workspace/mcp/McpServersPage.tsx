import * as React from "react"
import {
  ActivityIcon,
  BracesIcon,
  CheckCircle2Icon,
  Clock3Icon,
  FileUpIcon,
  KeyRoundIcon,
  PlugZapIcon,
  RefreshCwIcon,
  ServerIcon,
  ShieldCheckIcon,
  TerminalIcon,
  Trash2Icon,
  WrenchIcon,
} from "lucide-react"

import { Button } from "@/components/ui/Button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/Input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/Textarea"
import {
  mcpServers,
  mcpTools,
  mcpTraces,
  type McpServer,
  type McpServerStatus,
  type McpTool,
  type McpTrace,
} from "@/features/workspace/mcp/mcp-data"
import { cn } from "@/lib/utils"

type McpConsoleLine = {
  time: string
  level: "info" | "ok" | "warn" | "error"
  message: string
}

const consoleLines: McpConsoleLine[] = [
  {
    time: "18:41:02",
    level: "info",
    message: "router.start --registry sqlite://geonexus.db",
  },
  {
    time: "18:41:03",
    level: "ok",
    message: "ping qgis-mcp --url localhost:7021 -> 142 ms",
  },
  {
    time: "18:41:04",
    level: "ok",
    message: "tools qgis-mcp -> buffer,distance,load_layer,heatmap,cluster",
  },
  {
    time: "18:41:05",
    level: "warn",
    message: "schema arcgis-mcp pendiente hasta registrar endpoint local",
  },
  {
    time: "18:41:06",
    level: "warn",
    message: "schema supabase-mcp pendiente: OAuth y project_ref sin autenticar",
  },
  {
    time: "18:41:07",
    level: "error",
    message: "dispatch load_layer bloqueado: ruta fuera de allowlist",
  },
]

export function McpServersPage() {
  const [registerOpen, setRegisterOpen] = React.useState(false)
  const [selectedServerId, setSelectedServerId] = React.useState<string | null>(
    null
  )

  const selectedServer = selectedServerId
    ? mcpServers.find((server) => server.id === selectedServerId)
    : undefined

  return (
    <section className="relative z-10 h-[calc(100svh-3.5rem)] overflow-auto px-3 py-3 sm:px-5 sm:py-4">
      <div className="mx-auto grid w-full max-w-[110rem] gap-3">
        <McpHeader onRegister={() => setRegisterOpen(true)} />

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="grid min-w-0 gap-3">
            <ServerGrid onSelectServer={setSelectedServerId} />
            <McpConsole variant="wide" />
          </div>
          <aside className="grid content-start gap-3">
            <RegisterPanel onRegister={() => setRegisterOpen(true)} />
            <TracePanel />
          </aside>
        </div>
      </div>

      <RegisterMcpDialog
        open={registerOpen}
        onOpenChange={setRegisterOpen}
      />
      <ServerDetailSheet
        server={selectedServer}
        tools={
          selectedServer
            ? mcpTools.filter((tool) => tool.server === selectedServer.id)
            : []
        }
        open={Boolean(selectedServer)}
        onOpenChange={(open) => {
          if (!open) setSelectedServerId(null)
        }}
      />
    </section>
  )
}

function McpHeader({ onRegister }: { onRegister: () => void }) {
  return (
    <header className="overflow-hidden rounded-lg border border-border/80 bg-card/95 shadow-sm backdrop-blur">
      <div className="h-0.5 bg-[linear-gradient(90deg,var(--primary),transparent)]" />
      <div className="p-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="flex min-w-0 items-start gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ServerIcon className="size-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold tracking-tight">
                Servidores MCP
              </h1>
              <p className="mt-0.5 max-w-4xl text-sm leading-5 text-muted-foreground">
                Administra servidores MCP, registra configuraciones locales,
                valida ping y revisa trazas del router antes de exponer tools al
                chat IA.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button size="sm" onClick={onRegister}>
              <PlugZapIcon className="size-4" />
              Registrar servidor
            </Button>
            <Button variant="outline" size="sm">
              <RefreshCwIcon className="size-4" />
              Probar conexiones
            </Button>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <Metric label="Servidores" value={String(mcpServers.length)} />
          <Metric label="Tools V1" value={String(mcpTools.length)} />
          <Metric
            label="Online"
            value={String(
              mcpServers.filter((server) => server.status === "online").length
            )}
          />
          <Metric label="Rate limit" value="60/min" />
        </div>
      </div>
    </header>
  )
}

function ServerGrid({
  onSelectServer,
}: {
  onSelectServer: (serverId: string) => void
}) {
  return (
    <section className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
      {mcpServers.map((server) => (
        <ServerCard
          key={server.id}
          server={server}
          onSelect={() => onSelectServer(server.id)}
        />
      ))}
    </section>
  )
}

function ServerCard({
  server,
  onSelect,
}: {
  server: McpServer
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className="rounded-lg border border-border/80 bg-card/95 p-2.5 text-left shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-border">
            <server.icon className="size-3.5" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">{server.name}</h2>
            <p className="mt-0.5 truncate font-mono text-[0.68rem] text-muted-foreground">
              {server.url}
            </p>
          </div>
        </div>
        <ServerStatus status={server.status} />
      </div>

      <p className="mt-2 line-clamp-2 text-xs leading-4 text-muted-foreground">
        {server.description}
      </p>

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <Metric label="Tools" value={String(server.tools)} />
        <Metric label="Latencia" value={server.latency} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-[0.7rem] text-muted-foreground">
        <span>Ver herramientas y acciones</span>
        <WrenchIcon className="size-3.5" />
      </div>
    </button>
  )
}

function RegisterPanel({ onRegister }: { onRegister: () => void }) {
  return (
    <section className="rounded-lg border border-border/80 bg-card/95 p-3 shadow-sm backdrop-blur">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Agregar MCP</h2>
          <p className="text-xs text-muted-foreground">
            Manual o desde archivo de configuracion.
          </p>
        </div>
        <PlugZapIcon className="size-4 text-primary" />
      </div>
      <div className="grid gap-2">
        <Button size="sm" onClick={onRegister}>
          <PlugZapIcon className="size-4" />
          Abrir formulario
        </Button>
        <Button variant="outline" size="sm" asChild>
          <label>
            <FileUpIcon className="size-4" />
            Cargar config
            <input
              className="sr-only"
              type="file"
              accept=".json,.yaml,.yml,.toml"
            />
          </label>
        </Button>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        Al cargar un archivo, la UI envia la ruta a Tauri para validar schema,
        token, allowlist y ping antes de guardar el servidor.
      </p>
    </section>
  )
}

function McpConsole({ variant = "compact" }: { variant?: "compact" | "wide" }) {
  return (
    <section className="overflow-hidden rounded-lg border border-border/80 bg-card/95 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
        <div>
          <div className="flex items-center gap-2">
            <TerminalIcon className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">Consola MCP</h2>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Salida del router Rust: ping, registry, schema y dispatch.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-7">
            <RefreshCwIcon className="size-4" />
            Ping
          </Button>
          <Button variant="outline" size="sm" className="h-7">
            <ShieldCheckIcon className="size-4" />
            Validar
          </Button>
        </div>
      </div>
      <div
        className={cn(
          "space-y-1 overflow-auto bg-background/80 p-3 font-mono text-[0.72rem] [scrollbar-width:thin]",
          variant === "wide" ? "max-h-[30rem]" : "max-h-72"
        )}
      >
        <div className="mb-2 rounded-md border border-border bg-card/70 p-2 text-muted-foreground">
          <span className="text-primary">geonexus-mcp</span>{" "}
          <span>router --watch --project POT-Barranquilla-2024</span>
        </div>
        {consoleLines.map((line) => (
          <ConsoleLine key={`${line.time}-${line.message}`} line={line} />
        ))}
      </div>
    </section>
  )
}

function ServerDetailSheet({
  server,
  tools,
  open,
  onOpenChange,
}: {
  server?: McpServer
  tools: McpTool[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!server) {
    return <Sheet open={open} onOpenChange={onOpenChange} />
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[min(94vw,28rem)] gap-0 border-border bg-card/95 p-0 text-card-foreground shadow-[0_18px_70px_rgba(15,23,42,0.22)] backdrop-blur-xl sm:max-w-[28rem]">
        <div className="h-0.5 bg-[linear-gradient(90deg,var(--primary),transparent)]" />
        <SheetHeader className="border-b border-border px-4 pb-3 pt-4">
          <div className="flex items-start gap-3 pr-8">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-border">
              <server.icon className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <SheetTitle className="text-base">{server.name}</SheetTitle>
                <ServerStatus status={server.status} />
              </div>
              <SheetDescription className="mt-1 font-mono text-xs">
                {server.url}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="grid gap-3 overflow-auto p-4 [scrollbar-width:thin]">
          <div className="grid grid-cols-3 gap-2">
            <Metric label="Tools" value={String(tools.length)} />
            <Metric label="Latencia" value={server.latency} />
            <Metric label="Estado" value={server.status} />
          </div>

          <section className="rounded-lg border border-border bg-background/75 p-3">
            <h3 className="text-sm font-semibold">Herramientas del MCP</h3>
            <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
              Estas tools son las que el router puede exponer al chat IA cuando
              el servidor este validado.
            </p>
            <div className="mt-3 grid gap-2">
              {tools.length > 0 ? (
                tools.map((tool) => (
                  <article
                    key={tool.name}
                    className="rounded-md border border-border bg-card/70 p-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <TerminalIcon className="size-3.5 shrink-0 text-primary" />
                        <p className="truncate text-sm font-medium">
                          {tool.name}
                        </p>
                      </div>
                      <ToolStatus status={tool.status} />
                    </div>
                    <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                      args: {tool.args}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {tool.result}
                    </p>
                  </article>
                ))
              ) : (
                <div className="rounded-md border border-dashed border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                  Este servidor todavia no tiene tools registradas.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-background/75 p-3">
            <h3 className="text-sm font-semibold">Consola rapida</h3>
            <div className="mt-3 rounded-md bg-card/70 p-2 font-mono text-[0.72rem]">
              <ConsoleLine
                line={{
                  time: "ahora",
                  level: server.status === "online" ? "ok" : "warn",
                  message: `ping ${server.id} -> ${server.latency}`,
                }}
              />
              <ConsoleLine
                line={{
                  time: "ahora",
                  level: "info",
                  message: `registry.tools(${server.id}) -> ${tools.length} tools`,
                }}
              />
            </div>
          </section>
        </div>

        <SheetFooter className="border-t border-border bg-card/95 p-3">
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm">
              <RefreshCwIcon className="size-4" />
              Ping
            </Button>
            <Button variant="outline" size="sm">
              <BracesIcon className="size-4" />
              Schema
            </Button>
            <Button variant="destructive" size="sm">
              <Trash2Icon className="size-4" />
              Eliminar
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function TracePanel() {
  return (
    <section className="rounded-lg border border-border/80 bg-card/95 p-3 shadow-sm backdrop-blur">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ActivityIcon className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Trazas recientes</h2>
        </div>
        <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[0.68rem] font-medium text-primary">
          live
        </span>
      </div>
      <div className="grid gap-2">
        {mcpTraces.map((trace) => (
          <TraceRow key={trace.traceId} trace={trace} />
        ))}
      </div>
    </section>
  )
}

function RegisterMcpDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const exampleConfig = `{
  "id": "supabase-mcp",
  "name": "Supabase MCP",
  "type": "http",
  "url": "https://mcp.supabase.com/mcp?project_ref=env:SUPABASE_PROJECT_REF&read_only=true",
  "auth": "oauth:auto",
  "tools": ["list_tables", "execute_sql", "get_advisors"]
}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(94vw,46rem)] rounded-lg p-0">
        <DialogHeader className="mb-0 border-b border-border px-4 pb-3 pt-4">
          <div className="flex items-start gap-2.5 pr-8">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PlugZapIcon className="size-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base">
                Registrar servidor MCP
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm leading-5">
                Agrega un servidor manualmente o pega un JSON de configuracion.
                Luego se valida por Tauri antes de guardarlo.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form className="grid gap-4 p-4">
          <div className="grid gap-3 lg:grid-cols-2">
            <section className="grid gap-2 rounded-lg border border-border bg-background/75 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <KeyRoundIcon className="size-4 text-primary" />
                Registro manual
              </div>
              <FormField label="Nombre" placeholder="Supabase MCP" />
              <FormField
                label="URL local/remota"
                placeholder="https://mcp.supabase.com/mcp?read_only=true"
              />
              <FormField label="Auth ref" placeholder="oauth:auto o env:MCP_TOKEN" />
              <FormField
                label="Tools"
                placeholder="list_tables, execute_sql, get_advisors"
              />
            </section>

            <section className="grid gap-2 rounded-lg border border-border bg-background/75 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <BracesIcon className="size-4 text-primary" />
                Config por codigo
              </div>
              <Textarea
                rows={10}
                className="min-h-52 font-mono text-xs"
                defaultValue={exampleConfig}
              />
              <Button variant="outline" size="sm" asChild>
                <label>
                  <FileUpIcon className="size-4" />
                  Seleccionar archivo config
                  <input
                    className="sr-only"
                    type="file"
                    accept=".json,.yaml,.yml,.toml"
                  />
                </label>
              </Button>
            </section>
          </div>

          <div className="rounded-lg border border-border bg-muted/45 px-3 py-2.5 text-sm leading-5 text-muted-foreground">
            Flujo esperado: seleccionar archivo o llenar formulario, enviar ruta
            o payload a Tauri, validar schema y allowlist, hacer ping, registrar
            en SQLite y refrescar el registry de tools.
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-3 sm:flex-row sm:justify-between">
            <Button variant="outline" size="sm" type="button">
              <RefreshCwIcon className="size-4" />
              Probar ping
            </Button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button size="sm" type="submit">
                <PlugZapIcon className="size-4" />
                Agregar MCP
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function FormField({
  label,
  placeholder,
}: {
  label: string
  placeholder: string
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <Input placeholder={placeholder} />
    </label>
  )
}

function ConsoleLine({ line }: { line: McpConsoleLine }) {
  return (
    <div className="flex gap-2 rounded-md px-1.5 py-1">
      <span className="shrink-0 text-muted-foreground">{line.time}</span>
      <span
        className={cn(
          "shrink-0",
          line.level === "ok" &&
            "text-emerald-600 [.geo-dark_&]:text-emerald-300 [.graphite_&]:text-emerald-300 [.midnight_&]:text-emerald-300",
          line.level === "info" && "text-primary",
          line.level === "warn" &&
            "text-amber-600 [.geo-dark_&]:text-amber-300 [.graphite_&]:text-amber-300 [.midnight_&]:text-amber-300",
          line.level === "error" && "text-destructive"
        )}
      >
        {line.level}
      </span>
      <span className="min-w-0 text-muted-foreground">{line.message}</span>
    </div>
  )
}

function TraceRow({ trace }: { trace: McpTrace }) {
  return (
    <div className="rounded-md border border-border bg-background/75 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium">{trace.tool}</p>
        <TraceStatus status={trace.status} />
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="truncate">{trace.server}</span>
        <span>{trace.duration}</span>
      </div>
      <p className="mt-1 truncate font-mono text-[0.68rem] text-muted-foreground">
        {trace.traceId}
      </p>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/75 px-2.5 py-1">
      <p className="text-[0.66rem] leading-3 text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold leading-4">{value}</p>
    </div>
  )
}

function ServerStatus({ status }: { status: McpServerStatus }) {
  const Icon = status === "online" ? CheckCircle2Icon : Clock3Icon

  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded-md px-1.5 text-[0.68rem] font-medium",
        status === "online" &&
          "bg-emerald-500/10 text-emerald-700 [.geo-dark_&]:text-emerald-300 [.graphite_&]:text-emerald-300 [.midnight_&]:text-emerald-300",
        status === "degraded" &&
          "bg-amber-500/10 text-amber-700 [.geo-dark_&]:text-amber-300 [.graphite_&]:text-amber-300 [.midnight_&]:text-amber-300",
        status === "offline" && "bg-muted text-muted-foreground",
        status === "planned" &&
          "bg-sky-500/10 text-sky-700 [.geo-dark_&]:text-sky-300 [.graphite_&]:text-sky-300 [.midnight_&]:text-sky-300"
      )}
    >
      <Icon className="size-3" />
      {status}
    </span>
  )
}

function ToolStatus({ status }: { status: McpTool["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit items-center rounded-md px-2 text-[0.7rem] font-medium",
        status === "ready" && "bg-primary/10 text-primary",
        status === "guarded" &&
          "bg-amber-500/10 text-amber-700 [.geo-dark_&]:text-amber-300 [.graphite_&]:text-amber-300 [.midnight_&]:text-amber-300",
        status === "planned" && "bg-muted text-muted-foreground"
      )}
    >
      {status}
    </span>
  )
}

function TraceStatus({ status }: { status: McpTrace["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 rounded-md px-1.5 text-[0.68rem] font-medium",
        status === "ok" && "bg-primary/10 text-primary",
        status === "queued" && "bg-muted text-muted-foreground",
        status === "blocked" && "bg-destructive/10 text-destructive"
      )}
    >
      {status}
    </span>
  )
}
