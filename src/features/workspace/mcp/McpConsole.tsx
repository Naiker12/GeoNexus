import * as React from "react"
import {
  RefreshCwIcon,
  ShieldCheckIcon,
  TerminalIcon,
  Trash2Icon,
  PlusIcon,
  Maximize2Icon,
  CopyIcon,
  SearchIcon,
  Settings2Icon,
  PlayIcon,
  AlignLeftIcon,
  ChevronDownIcon,
  XIcon,
} from "lucide-react"

import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"

type McpConsoleLine = {
  time: string
  level: "info" | "ok" | "warn" | "error" | "system" | "input"
  message: string
}

// Log streams mock data
const streams: Record<string, McpConsoleLine[]> = {
  bash: [
    { time: "18:41:01", level: "system", message: "Compiling geonexus-mcp v0.1.0 (D:\\GeoNexus\\crates\\mcp-router)" },
    { time: "18:41:02", level: "system", message: "    Finished dev [unoptimized + debuginfo] target(s) in 1.84s" },
    { time: "18:41:02", level: "system", message: "     Running `target\\debug\\mcp-router.exe --watch --project POT-Barranquilla-2024`" },
    { time: "18:41:02", level: "info", message: "router.start --registry sqlite://geonexus.db" },
    { time: "18:41:03", level: "ok", message: "ping qgis-mcp --url localhost:7021 -> online (142 ms)" },
    { time: "18:41:04", level: "ok", message: "tools qgis-mcp -> buffer, distance, load_layer, heatmap, cluster" },
    { time: "18:41:05", level: "warn", message: "schema arcgis-mcp pendiente: falta registrar endpoint local" },
    { time: "18:41:06", level: "warn", message: "schema supabase-mcp pendiente: OAuth y project_ref sin autenticar" },
    { time: "18:41:07", level: "error", message: "dispatch load_layer bloqueado: ruta fuera de allowlist de Tauri" },
  ],
  tauri: [
    { time: "18:40:50", level: "system", message: "[Tauri Core] Inicializando bindings de Tauri API..." },
    { time: "18:40:51", level: "ok", message: "[Tauri Core] Canal IPC inicializado exitosamente en \\\\.\\pipe\\geonexus-ipc" },
    { time: "18:40:52", level: "info", message: "[Tauri Core] Cargando módulo de base de datos SQLite persistente..." },
    { time: "18:40:52", level: "ok", message: "[Tauri Core] SQLite cargado: 12 esquemas locales validados" },
    { time: "18:40:55", level: "info", message: "[Tauri Core] Validando reglas de allowlist para llamadas de red externas..." },
    { time: "18:40:55", level: "warn", message: "[Tauri Core] Redirección remota detectada para supabase-mcp. Comprobando CORS..." },
  ],
  sqlite: [
    { time: "18:40:51", level: "info", message: "[SQLite] Conectando a sqlite://geonexus.db..." },
    { time: "18:40:51", level: "ok", message: "[SQLite] Conexión abierta con éxito. Pool de 5 hilos iniciado." },
    { time: "18:40:52", level: "info", message: "[SQLite] Tabla 'mcp_servers': 4 registros leídos." },
    { time: "18:40:52", level: "info", message: "[SQLite] Tabla 'mcp_tools_cache': 8 registros leídos." },
    { time: "18:40:53", level: "ok", message: "[SQLite] Cache de herramientas sincronizada con SQLite." },
  ],
}

export function McpConsole() {
  const [activeTab, setActiveTab] = React.useState<"problems" | "output" | "debug" | "terminal">("terminal")
  const [streamKey, setStreamKey] = React.useState<"bash" | "tauri" | "sqlite">("bash")
  const [lines, setLines] = React.useState<McpConsoleLine[]>(streams.bash)
  
  // Terminal commands history
  const [inputVal, setInputVal] = React.useState("")
  const [history, setHistory] = React.useState<string[]>([])
  const [historyIndex, setHistoryIndex] = React.useState(-1)

  // Search & wrap states
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isSearchOpen, setIsSearchOpen] = React.useState(false)
  const [isWordWrap, setIsWordWrap] = React.useState(true)
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false)

  const consoleEndRef = React.useRef<HTMLDivElement>(null)

  // Scroll to bottom when lines update
  React.useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [lines])

  // Reset lines when stream changes
  React.useEffect(() => {
    setLines(streams[streamKey])
  }, [streamKey])

  const handleCommand = (cmd: string) => {
    const trimmed = cmd.trim().toLowerCase()
    const now = new Date().toLocaleTimeString()

    // Add command to history
    if (trimmed !== "") {
      setHistory((prev) => [cmd, ...prev])
      setHistoryIndex(-1)
    }

    // Add input to logs
    const newLines = [...lines, { time: now, level: "input" as const, message: `$ ${cmd}` }]

    if (trimmed === "clear") {
      setLines([])
      return
    }

    if (trimmed === "help") {
      newLines.push(
        { time: now, level: "system", message: "Comandos interactivos disponibles:" },
        { time: now, level: "info", message: "  help    - Muestra este menú de ayuda" },
        { time: now, level: "info", message: "  clear   - Limpia la pantalla de la consola" },
        { time: now, level: "info", message: "  ping    - Realiza ping a todos los servidores de la lista" },
        { time: now, level: "info", message: "  list    - Muestra los servidores MCP registrados" },
        { time: now, level: "info", message: "  status  - Diagnóstico rápido de estados y latencias" },
        { time: now, level: "info", message: "  tools   - Lista las herramientas expuestas al chat" }
      )
    } else if (trimmed === "ping") {
      newLines.push(
        { time: now, level: "system", message: "Iniciando ping secuencial a servidores..." },
        { time: now, level: "ok", message: "  [online]  qgis-mcp (localhost:7021) -> RTT 138ms" },
        { time: now, level: "ok", message: "  [online]  memory-mcp (localhost:7011) -> RTT 42ms" },
        { time: now, level: "warn", message: "  [planned] arcgis-mcp (localhost:7041) -> SIN RESPUESTA (schema pending)" },
        { time: now, level: "warn", message: "  [planned] supabase-mcp (mcp.supabase.com/mcp) -> OAUTH_PENDING" },
        { time: now, level: "system", message: "Ping completado. 2 activos, 2 inactivos." }
      )
    } else if (trimmed === "list") {
      newLines.push(
        { time: now, level: "info", message: "Servidores registrados en geonexus.db:" },
        { time: now, level: "info", message: "  1. qgis-mcp (http://localhost:7021) - ONLINE" },
        { time: now, level: "info", message: "  2. memory-mcp (http://localhost:7011) - ONLINE" },
        { time: now, level: "info", message: "  3. arcgis-mcp (http://localhost:7041) - PENDIENTE" },
        { time: now, level: "info", message: "  4. supabase-mcp (https://mcp.supabase.com/mcp) - PENDIENTE" }
      )
    } else if (trimmed === "status") {
      newLines.push(
        { time: now, level: "system", message: "Reporte de Diagnóstico Core Router:" },
        { time: now, level: "ok", message: "  • Conexión SQLite: OK (SQLite 3.45.0)" },
        { time: now, level: "ok", message: "  • Allowlist de archivos: Configurado (/workspace/data/*)" },
        { time: now, level: "error", message: "  • Errores acumulados en qgis-mcp: 1 (LoadLayer error #44)" },
        { time: now, level: "info", message: "  • Memoria asignada al proceso: 34 MB" }
      )
    } else if (trimmed === "tools") {
      newLines.push(
        { time: now, level: "system", message: "Herramientas expuestas (8 cargadas):" },
        { time: now, level: "ok", message: "  - GIS: buffer, distance, load_layer, heatmap, cluster" },
        { time: now, level: "ok", message: "  - Memoria: query_pot, store_context, recall" }
      )
    } else if (trimmed !== "") {
      newLines.push({
        time: now,
        level: "error",
        message: `Comando no reconocido: "${cmd}". Escribe "help" para ver comandos disponibles.`,
      })
    }

    setLines(newLines)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleCommand(inputVal)
      setInputVal("")
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      if (history.length > 0 && historyIndex < history.length - 1) {
        const nextIdx = historyIndex + 1
        setHistoryIndex(nextIdx)
        setInputVal(history[nextIdx])
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1
        setHistoryIndex(nextIdx)
        setInputVal(history[nextIdx])
      } else if (historyIndex === 0) {
        setHistoryIndex(-1)
        setInputVal("")
      }
    }
  }

  const handleCopy = () => {
    const text = lines
      .filter((l) => l.message.toLowerCase().includes(searchQuery.toLowerCase()))
      .map((l) => `[${l.time}] [${l.level.toUpperCase()}] ${l.message}`)
      .join("\n")
    navigator.clipboard.writeText(text)
  }

  // Filter logs by search query
  const filteredLines = lines.filter((l) =>
    l.message.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-[#0d0e11] shadow-xl">
      {/* VS Code Tab and Toolbar Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/80 bg-[#16181d] px-2 text-xs text-slate-400 select-none">
        {/* Left Tabs */}
        <div className="flex items-center">
          <TabButton
            label="PROBLEMAS"
            badge="1"
            isActive={activeTab === "problems"}
            onClick={() => setActiveTab("problems")}
          />
          <TabButton
            label="SALIDA"
            isActive={activeTab === "output"}
            onClick={() => setActiveTab("output")}
          />
          <TabButton
            label="CONSOLA DE DEPURACIÓN"
            isActive={activeTab === "debug"}
            onClick={() => setActiveTab("debug")}
          />
          <TabButton
            label="TERMINAL"
            isActive={activeTab === "terminal"}
            onClick={() => setActiveTab("terminal")}
          />
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 px-2 py-1.5 sm:py-0 relative z-30">
          {/* Stream Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-1 text-[10px] bg-[#1e222b] hover:bg-[#282c34] px-2 py-0.5 rounded text-slate-300 font-mono transition"
            >
              <span>{streamKey === "bash" ? "mcp-router (bash)" : streamKey === "tauri" ? "tauri-core (rust)" : "sqlite-db (sql)"}</span>
              <ChevronDownIcon className="size-3" />
            </button>
            {isDropdownOpen && (
              <div className="absolute right-0 mt-1 w-44 rounded-md border border-border bg-[#16181d] shadow-lg py-1 font-mono text-[10px] text-slate-300">
                <button
                  onClick={() => {
                    setStreamKey("bash")
                    setIsDropdownOpen(false)
                  }}
                  className={cn(
                    "flex w-full items-center px-3 py-1.5 hover:bg-[#282c34] text-left",
                    streamKey === "bash" && "text-emerald-400 font-bold"
                  )}
                >
                  mcp-router (bash)
                </button>
                <button
                  onClick={() => {
                    setStreamKey("tauri")
                    setIsDropdownOpen(false)
                  }}
                  className={cn(
                    "flex w-full items-center px-3 py-1.5 hover:bg-[#282c34] text-left",
                    streamKey === "tauri" && "text-emerald-400 font-bold"
                  )}
                >
                  tauri-core (rust)
                </button>
                <button
                  onClick={() => {
                    setStreamKey("sqlite")
                    setIsDropdownOpen(false)
                  }}
                  className={cn(
                    "flex w-full items-center px-3 py-1.5 hover:bg-[#282c34] text-left",
                    streamKey === "sqlite" && "text-emerald-400 font-bold"
                  )}
                >
                  sqlite-db (sql)
                </button>
              </div>
            )}
          </div>

          {/* Interactive Search toggle */}
          {isSearchOpen ? (
            <div className="flex items-center gap-1 bg-[#1e222b] px-1.5 py-0.5 rounded border border-border/60">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrar logs..."
                className="bg-transparent border-none outline-none text-[10px] text-[#cccccc] w-24 p-0 focus:ring-0"
                autoFocus
              />
              <button onClick={() => { setSearchQuery(""); setIsSearchOpen(false) }}>
                <XIcon className="size-3 hover:text-white text-slate-400" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsSearchOpen(true)}
              title="Filtrar logs"
              className="p-1 hover:bg-[#282c34] hover:text-white rounded transition"
            >
              <SearchIcon className="size-3.5 text-slate-400" />
            </button>
          )}

          <button
            onClick={() => setIsWordWrap(!isWordWrap)}
            title="Ajuste de Línea (Word Wrap)"
            className={cn(
              "p-1 rounded transition",
              isWordWrap ? "bg-emerald-500/20 text-emerald-400" : "hover:bg-[#282c34] hover:text-white"
            )}
          >
            <AlignLeftIcon className="size-3.5 text-slate-400" />
          </button>
          <button
            onClick={() => handleCommand("ping")}
            title="Probar todos / Ping"
            className="p-1 hover:bg-[#282c34] hover:text-white rounded transition"
          >
            <PlayIcon className="size-3.5 text-slate-400" />
          </button>
          <button
            onClick={handleCopy}
            title="Copiar Logs"
            className="p-1 hover:bg-[#282c34] hover:text-white rounded transition"
          >
            <CopyIcon className="size-3.5 text-slate-400" />
          </button>
          <button
            onClick={() => setLines([])}
            title="Limpiar Consola"
            className="p-1 hover:bg-[#282c34] hover:text-white rounded transition"
          >
            <Trash2Icon className="size-3.5 text-slate-400" />
          </button>
          <button className="p-1 hover:bg-[#282c34] hover:text-white rounded transition">
            <PlusIcon className="size-3.5 text-slate-400" />
          </button>
          <button className="p-1 hover:bg-[#282c34] hover:text-white rounded transition">
            <Maximize2Icon className="size-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Terminal Viewports */}
      <div className="h-64 overflow-y-auto bg-[#090a0c] p-3 font-mono text-[11px] leading-relaxed [scrollbar-width:thin] select-text">
        {activeTab !== "terminal" ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
            <TerminalIcon className="size-8 text-slate-600 animate-pulse" />
            <span>Pestaña disponible en modo simulación. Activa "TERMINAL" para interactuar.</span>
            <Button
              variant="outline"
              size="sm"
              className="mt-1 h-7 text-xs border-slate-700 hover:bg-slate-800 text-slate-200"
              onClick={() => setActiveTab("terminal")}
            >
              Ir a Terminal
            </Button>
          </div>
        ) : (
          <div className="space-y-0.5">
            {filteredLines.map((line, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-start gap-2.5 px-1 py-0.5 rounded hover:bg-white/[0.02] transition-colors",
                  isWordWrap ? "whitespace-normal break-all" : "whitespace-nowrap"
                )}
              >
                {line.level !== "input" && line.level !== "system" && (
                  <span className="shrink-0 text-slate-500 text-[9px] select-none mt-0.5 font-mono">
                    {line.time}
                  </span>
                )}
                {line.level === "input" ? (
                  <div className="flex items-center gap-1.5 text-emerald-400 font-mono">
                    <span className="text-slate-500 select-none">geonexus-mcp $</span>
                    <span className="text-[#cccccc] font-medium">{line.message.replace("$ ", "")}</span>
                  </div>
                ) : (
                  <span
                    className={cn(
                      "min-w-0 font-mono",
                      line.level === "ok" && "text-emerald-400 font-semibold",
                      line.level === "info" && "text-[#56b6c2]",
                      line.level === "warn" && "text-[#d19a66]",
                      line.level === "error" && "text-[#e06c75] font-semibold",
                      line.level === "system" && "text-[#abb2bf] italic opacity-85"
                    )}
                  >
                    {line.message}
                  </span>
                )}
              </div>
            ))}

            {filteredLines.length === 0 && searchQuery && (
              <div className="text-slate-500 py-4 text-center">
                Ninguna línea coincide con el filtro "{searchQuery}"
              </div>
            )}

            {/* Live prompt input line */}
            <div className="flex items-center gap-1.5 px-1 py-1 mt-1 border-t border-white/[0.03] pt-2">
              <span className="shrink-0 text-emerald-400 select-none">geonexus-mcp</span>
              <span className="shrink-0 text-slate-500 select-none">$</span>
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent border-none outline-none text-[#cccccc] font-mono text-[11px] placeholder:text-slate-600 focus:ring-0 p-0"
                placeholder="Escribe 'help' o 'ping'..."
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
            </div>
            <div ref={consoleEndRef} />
          </div>
        )}
      </div>
    </section>
  )
}

function TabButton({
  label,
  badge,
  isActive,
  onClick,
}: {
  label: string
  badge?: string
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium tracking-wide transition-all duration-150 outline-none",
        isActive
          ? "border-primary text-white bg-[#0d0e11]"
          : "border-transparent text-slate-400 hover:text-white hover:bg-[#1c1f26]"
      )}
    >
      <span>{label}</span>
      {badge && (
        <span className="flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
          {badge}
        </span>
      )}
    </button>
  )
}
