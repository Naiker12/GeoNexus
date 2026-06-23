import * as React from "react"
import { useEffect, useMemo, useCallback } from "react"
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"
import { useUiStore } from "@/stores/uiStore"
import { buildRegistry, type CommandDef } from "@/lib/commandRegistry"

function navigate(hash: string) {
  window.location.hash = hash
}

const REGISTRY = buildRegistry(navigate)

const categoryOrder = [
  "Chat", "Agentes", "Workspace", "Conocimiento", "Búsqueda", "MCP", "Connections", "GIS", "Sistema", "General",
]

function groupByCategory(cmds: CommandDef[]) {
  const map = new Map<string, CommandDef[]>()
  for (const c of cmds) {
    const list = map.get(c.category) ?? []
    list.push(c)
    map.set(c.category, list)
  }
  return Array.from(map.entries()).sort(
    (a, b) => categoryOrder.indexOf(a[0]) - categoryOrder.indexOf(b[0]),
  )
}

export function CommandPalette() {
  const open = useUiStore((s) => s.commandPaletteOpen)
  const setOpen = useUiStore((s) => s.setCommandPaletteOpen)
  const [query, setQuery] = React.useState("")

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.includes("Mac")
      if ((isMac ? e.metaKey : e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen(!open)
      }
      if (e.key === "Escape" && open) {
        setOpen(false)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, setOpen])

  const grouped = useMemo(() => {
    const q = query.toLowerCase()
    const filtered = REGISTRY.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.keywords?.some((k) => k.toLowerCase().includes(q)),
    )
    return groupByCategory(filtered)
  }, [query])

  const runCommand = useCallback(
    (cmd: CommandDef) => {
      setOpen(false)
      setQuery("")
      cmd.run()
    },
    [setOpen, setQuery],
  )

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[12vh]"
      onClick={() => { setOpen(false); setQuery("") }}
    >
      <div
        className="w-[min(92vw,600px)] rounded-xl border border-border bg-popover shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar comando..."
            value={query}
            onValueChange={setQuery}
            className="border-b"
          />
          <CommandList className="max-h-[400px]">
            <CommandEmpty>
              {query ? `No se encontraron resultados para "${query}"` : "Escribe para buscar comandos"}
            </CommandEmpty>
            {grouped.map(([cat, cmds]) => (
              <CommandGroup key={cat} heading={cat}>
                {cmds.map((c) => (
                  <CommandItem
                    key={c.id}
                    onSelect={() => runCommand(c)}
                    className="flex justify-between"
                  >
                    <span>{c.label}</span>
                    {c.shortcut && (
                      <kbd className="text-[10px] text-muted-foreground/60 font-mono ml-4 shrink-0">
                        {c.shortcut}
                      </kbd>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </div>
    </div>
  )
}
