import { useState, useMemo } from "react"
import { SearchIcon, HashIcon, MessageSquareIcon, MapIcon, DatabaseIcon, GitBranchIcon, BarChart3Icon, FileTextIcon, GlobeIcon, SparklesIcon, KeyboardIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { SLASH_COMMANDS } from "@/features/workspace/commands/slash-commands"

type Status = "hecho" | "progreso" | "planeado"

type CommandEntry = {
  command: string
  description: string
  params: string
  example: string
  category: string
  status: Status
}

type ShortcutEntry = {
  keys: string[]
  description: string
  category: string
}

type MergedShortcut = {
  shortcuts: string[][]
  description: string
  category: string
}

const statusColors: Record<Status, string> = {
  hecho: "bg-emerald-500/15 text-emerald-600 border-emerald-200 dark:border-emerald-800",
  progreso: "bg-amber-500/15 text-amber-600 border-amber-200 dark:border-amber-800",
  planeado: "bg-muted text-muted-foreground/60 border-border",
}

const statusLabels: Record<Status, string> = {
  hecho: "Disponible",
  progreso: "En desarrollo",
  planeado: "Planeado",
}

const IMPLEMENTED = new Set(["/ayuda", "/limpiar", "/analizar", "/resumir", "/documento", "/buscar", "/norma", "/grafo", "/nodo", "/exportar", "/gis", "/ia", "/conectar"])

const commands: CommandEntry[] = SLASH_COMMANDS.map(c => ({
  command: c.command,
  description: c.description,
  params: c.params,
  example: c.example,
  category: c.category,
  status: IMPLEMENTED.has(c.command) ? "hecho" as const : "planeado" as const,
}))

const shortcuts: ShortcutEntry[] = [
  { keys: ["/"], description: "Abrir paleta de comandos", category: "General" },
  { keys: ["Ctrl", "K"], description: "Abrir paleta de comandos", category: "General" },
  { keys: ["Ctrl", "L"], description: "Limpiar conversación", category: "Chat" },
  { keys: ["Ctrl", "Shift", "P"], description: "Abrir configuración", category: "General" },
  { keys: ["Ctrl", "Shift", "F"], description: "Buscar en documentos", category: "Búsqueda" },
  { keys: ["Ctrl", "Shift", "M"], description: "Abrir/cerrar mapa", category: "GIS" },
  { keys: ["Escape"], description: "Cerrar panel o modal activo", category: "General" },
  { keys: ["Ctrl", "Enter"], description: "Enviar mensaje", category: "Chat" },
  { keys: ["Shift", "Enter"], description: "Nueva línea en el mensaje", category: "Chat" },
  { keys: ["Ctrl", "Shift", "C"], description: "Copiar último mensaje", category: "Chat" },
  { keys: ["Ctrl", "Shift", "I"], description: "Abrir panel de IA", category: "IA" },
  { keys: ["Ctrl", "Shift", "G"], description: "Abrir grafo de conocimiento", category: "Conocimiento" },
]

const categoryIcons: Record<string, typeof HashIcon> = {
  General: HashIcon,
  "Gráficas": BarChart3Icon,
  GIS: MapIcon,
  Normas: FileTextIcon,
  Documentos: DatabaseIcon,
  Conocimiento: GitBranchIcon,
  "Análisis": SparklesIcon,
  "Búsqueda": SearchIcon,
  "Datos": GlobeIcon,
  IA: MessageSquareIcon,
  Chat: MessageSquareIcon,
}

export function CommandsSection() {
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<Status | "todas">("todas")

  const filteredCommands = useMemo(() => {
    let list = commands
    if (statusFilter !== "todas") {
      list = list.filter((c) => c.status === statusFilter)
    }
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(
        (c) =>
          c.command.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q),
      )
    }
    return list
  }, [query, statusFilter])

  const filteredShortcuts = useMemo(() => {
    if (!query.trim()) return shortcuts
    const q = query.toLowerCase()
    return shortcuts.filter(
      (s) =>
        s.keys.join(" ").toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q),
    )
  }, [query])

  const groupedCommands = useMemo(() => {
    const map = new Map<string, CommandEntry[]>()
    for (const cmd of filteredCommands) {
      const list = map.get(cmd.category) ?? []
      list.push(cmd)
      map.set(cmd.category, list)
    }
    return Array.from(map.entries())
  }, [filteredCommands])

  const groupedShortcuts = useMemo(() => {
    // Merge shortcuts with same description
    const merged = new Map<string, MergedShortcut>()
    for (const s of filteredShortcuts) {
      const key = `${s.category}::${s.description}`
      if (merged.has(key)) {
        merged.get(key)!.shortcuts.push(s.keys)
      } else {
        merged.set(key, { shortcuts: [s.keys], description: s.description, category: s.category })
      }
    }
    // Group by category
    const map = new Map<string, MergedShortcut[]>()
    for (const [, ms] of merged) {
      const list = map.get(ms.category) ?? []
      list.push(ms)
      map.set(ms.category, list)
    }
    return Array.from(map.entries())
  }, [filteredShortcuts])

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-base font-semibold tracking-tight">Comandos y atajos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Escribe <code className="rounded bg-muted px-1 py-0.5 text-xs font-semibold text-foreground">/comando</code> en el chat o usa atajos de teclado.
        </p>
      </header>

      <div className="relative">
        <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar comandos o atajos..."
          className="h-9 w-full rounded-md border border-border bg-background pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
        />
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-1.5">
        {(["todas", "hecho", "progreso", "planeado"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={cn(
              "rounded-md border px-2 py-0.5 text-[0.65rem] font-medium transition-colors",
              statusFilter === s
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border text-muted-foreground/60 hover:border-primary/30 hover:text-foreground",
            )}
          >
            {s === "todas" ? "Todas" : statusLabels[s]}
          </button>
        ))}
      </div>

      {/* Keyboard shortcuts */}
      {groupedShortcuts.length > 0 && (!query || groupedCommands.length > 0 || groupedShortcuts.length > 0) && (
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            <KeyboardIcon className="size-3.5" />
            Atajos de teclado
          </div>
          <div className="grid gap-1.5">
            {groupedShortcuts.map(([cat, items]) => (
              <div key={cat}>
                {items.map((s, i) => (
                  <div
                    key={`${s.shortcuts.map(k => k.join("+")).join("|")}-${i}`}
                    className="flex items-center justify-between rounded-lg border border-border/70 bg-background/60 px-3 py-2 transition-colors hover:border-primary/30 hover:bg-background"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex items-center gap-0.5 shrink-0">
                        {s.shortcuts.map((keys, si) => (
                          <span key={si} className="flex items-center gap-0.5">
                            {keys.map((key, ki) => (
                              <span key={ki} className="inline-flex h-5 items-center rounded border border-border/80 bg-muted/80 px-1.5 text-[0.6rem] font-mono font-semibold text-foreground/80 shadow-sm">
                                {key === " " ? "Space" : key}
                              </span>
                            ))}
                            {si < s.shortcuts.length - 1 && <span className="text-[0.5rem] text-muted-foreground/40 mx-0.5">ó</span>}
                          </span>
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground/50">{cat}</span>
                    </div>
                    <span className="text-xs text-muted-foreground truncate ml-2">{s.description}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* / commands */}
      {groupedCommands.length === 0 && !query ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No hay comandos
        </p>
      ) : groupedCommands.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No se encontraron resultados para &quot;{query}&quot;
        </p>
      ) : (
        <div className="space-y-5">
          {groupedCommands.map(([category, cmds]) => {
            const CatIcon = categoryIcons[category] ?? HashIcon
            return (
              <div key={category}>
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                  <CatIcon className="size-3.5" />
                  {category}
                </div>
                <div className="grid gap-1.5">
                  {cmds.map((cmd) => (
                    <div
                      key={cmd.command}
                      className="group rounded-lg border border-border/70 bg-background/60 px-3 py-2 transition-colors hover:border-primary/30 hover:bg-background"
                    >
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <code className="text-sm font-semibold text-primary">{cmd.command}</code>
                        {cmd.params && (
                          <code className="text-[0.65rem] text-muted-foreground/60">{cmd.params}</code>
                        )}
                        <span className={cn("ml-auto rounded-md border px-1.5 py-0.5 text-[0.55rem] font-medium leading-none", statusColors[cmd.status])}>
                          {statusLabels[cmd.status]}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                        {cmd.description}
                      </p>
                      <code className="mt-1 block text-[0.6rem] text-muted-foreground/40">
                        Ej: {cmd.example}
                      </code>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
