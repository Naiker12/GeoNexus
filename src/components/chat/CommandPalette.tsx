import * as React from "react"
import {
  DatabaseIcon,
  DownloadIcon,
  FileUpIcon,
  GitForkIcon,
  PaperclipIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  SparklesIcon,
  Trash2Icon,
  ZapIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import type { SlashCommand, SlashCommandGroup } from "@/types/chat"

interface CommandPaletteProps {
  query: string
  onSelect: (cmd: SlashCommand) => void
  onClose: () => void
  containerRef?: React.RefObject<HTMLDivElement | null>
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Paperclip: PaperclipIcon,
  Database: DatabaseIcon,
  GitFork: GitForkIcon,
  Plus: PlusIcon,
  Trash2: Trash2Icon,
  Download: DownloadIcon,
  Search: SearchIcon,
  Zap: ZapIcon,
  RefreshCw: RefreshCwIcon,
  Sparkles: SparklesIcon,
  FileUp: FileUpIcon,
}

const groupOrder: SlashCommandGroup[] = ["Contexto", "Chat", "Modo", "Sistema"]

export function CommandPalette({ query, onSelect, onClose, containerRef }: CommandPaletteProps) {
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const internalRef = React.useRef<HTMLDivElement>(null) as React.MutableRefObject<HTMLDivElement | null>

  const ALL_COMMANDS: SlashCommand[] = [
    { id: "attach-file", group: "Contexto", label: "Adjuntar archivo", description: "Sube un documento para usar en esta conversación", icon: "Paperclip", shortcut: null, action: () => {} },
    { id: "attach-asset", group: "Contexto", label: "Adjuntar asset indexado", description: "Busca y adjunta un asset del catálogo", icon: "Database", shortcut: null, action: () => {} },
    { id: "use-graph", group: "Contexto", label: "Usar grafo como contexto", description: "Incluye nodos del grafo de conocimiento en el prompt", icon: "GitFork", shortcut: null, action: () => {} },
    { id: "new-chat", group: "Chat", label: "Nuevo chat", description: "Empieza una conversación nueva", icon: "Plus", shortcut: "N", action: () => {} },
    { id: "clear-chat", group: "Chat", label: "Limpiar conversación", description: "Borra los mensajes de esta sesión", icon: "Trash2", shortcut: null, action: () => {} },
    { id: "export-chat", group: "Chat", label: "Exportar conversación", description: "Descarga la conversación como Markdown", icon: "Download", shortcut: null, action: () => {} },
    { id: "mode-research", group: "Modo", label: "Modo investigación", description: "Activa búsqueda web profunda en las respuestas", icon: "Search", shortcut: null, action: () => {} },
    { id: "mode-fast", group: "Modo", label: "Modo rápido", description: "Respuestas cortas y directas, sin fuentes", icon: "Zap", shortcut: null, action: () => {} },
    { id: "reindex", group: "Sistema", label: "Reindexar documentos", description: "Fuerza reindexación del catálogo de assets", icon: "RefreshCw", shortcut: null, action: () => {} },
  ]

  const filtered = React.useMemo(() => {
    if (!query.trim()) return ALL_COMMANDS
    const q = query.toLowerCase()
    return ALL_COMMANDS.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.description.toLowerCase().includes(q)
    )
  }, [query])

  const grouped = React.useMemo(() => {
    const groups = new Map<SlashCommandGroup, SlashCommand[]>()
    for (const g of groupOrder) groups.set(g, [])
    for (const cmd of filtered) {
      const arr = groups.get(cmd.group)
      if (arr) arr.push(cmd)
    }
    return groups
  }, [filtered])

  React.useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const el = containerRef?.current ?? internalRef.current
      if (el && !el.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [onClose, containerRef])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1))
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
        break
      case "Enter":
        e.preventDefault()
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action()
          onSelect(filtered[selectedIndex])
        }
        break
      case "Escape":
        e.preventDefault()
        onClose()
        break
    }
  }

  const flatIndex = (() => {
    let i = 0
    for (const g of groupOrder) {
      const cmds = grouped.get(g) ?? []
      for (const cmd of cmds) {
        if (cmd === filtered[selectedIndex]) return i
        i++
      }
    }
    return 0
  })()

  if (filtered.length === 0) return null

  return (
    <div
      ref={(el) => {
        internalRef.current = el
        if (containerRef) (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el
      }}
      className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-xl border border-border bg-card shadow-xl"
      onKeyDown={handleKeyDown}
    >
      <div className="max-h-64 overflow-y-auto p-1.5">
        {groupOrder.map((group) => {
          const cmds = grouped.get(group) ?? []
          if (cmds.length === 0) return null
          return (
            <div key={group}>
              <div className="px-2.5 py-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                {group}
              </div>
              {cmds.map((cmd) => {
                const Icon = iconMap[cmd.icon] ?? SparklesIcon
                const isSelected = cmd === filtered[selectedIndex]
                return (
                  <button
                    key={cmd.id}
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                      isSelected
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                    onClick={() => { cmd.action(); onSelect(cmd) }}
                    onMouseEnter={() => {
                      setSelectedIndex(filtered.indexOf(cmd))
                    }}
                  >
                    <div className="flex size-6 items-center justify-center rounded-md bg-background">
                      <Icon className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{cmd.label}</div>
                      <div className="truncate text-[0.7rem] text-muted-foreground">
                        {cmd.description}
                      </div>
                    </div>
                    {cmd.shortcut && (
                      <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[0.6rem] font-medium text-muted-foreground">
                        ⌘{cmd.shortcut}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
