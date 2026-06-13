import * as React from "react"
import { ChevronDownIcon, ChevronRightIcon, ToggleLeftIcon, ToggleRightIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMcpServers } from "@/features/workspace/mcp/hooks/useMcpServers"
import { listMcpTools, upsertMcpAllowlist, listMcpAllowlist } from "@/api/mcp"
import type { McpTool } from "@/types/mcp"

const CATEGORY_ICONS: Record<string, string> = {
  GIS: "📍", Memoria: "🧠", Datos: "🗄️", IA: "🤖", UI: "🖥️",
}

const CATEGORY_ORDER = ["GIS", "Búsqueda", "Código", "Documentos", "Memoria", "Datos", "IA", "UI"]

export function GisToolsPanel() {
  const { servers } = useMcpServers()
  const [tools, setTools] = React.useState<McpTool[]>([])
  const [enabled, setEnabled] = React.useState<Record<string, boolean>>({})

  React.useEffect(() => {
    if (servers.length === 0) return
    let cancelled = false
    Promise.all(servers.map((s) => listMcpTools(s.id))).then((results) => {
      if (cancelled) return
      const flat = results.flat()
      setTools(flat)
      return Promise.all(servers.map((s) => listMcpAllowlist(s.id)))
    }).then((rulesResults) => {
      if (cancelled || !rulesResults) return
      const ruleMap: Record<string, boolean> = {}
      for (const rules of rulesResults) {
        for (const r of rules) {
          ruleMap[r.tool_name] = r.allowed
        }
      }
      setEnabled(ruleMap)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [servers])

  const groups = React.useMemo(() => {
    const map = new Map<string, McpTool[]>()
    for (const tool of tools) {
      const cat = tool.category ?? "Sin categoría"
      const existing = map.get(cat) ?? []
      existing.push(tool)
      map.set(cat, existing)
    }
    return map
  }, [tools])

  const sortedCategories = React.useMemo(
    () => Array.from(groups.keys()).sort(
      (a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b)
    ),
    [groups]
  )

  const [expandedGroups, setExpandedGroups] = React.useState<string[]>(sortedCategories)

  React.useEffect(() => {
    setExpandedGroups((prev) => {
      const merged = new Set([...prev, ...sortedCategories])
      return Array.from(merged)
    })
  }, [sortedCategories])

  const toggleAllInGroup = async (category: string, on: boolean) => {
    const group = groups.get(category)
    if (!group) return
    const prev = { ...enabled }
    for (const tool of group) prev[tool.name] = on
    setEnabled(prev)
    try {
      await Promise.all(group.map((tool) =>
        upsertMcpAllowlist({
          server_id: tool.server_id,
          tool_name: tool.name,
          allowed: on,
        })
      ))
    } catch {
      setEnabled(enabled)
    }
  }

  const toggleTool = async (tool: McpTool) => {
    const next = !(enabled[tool.name] !== false)
    setEnabled((prev) => ({ ...prev, [tool.name]: next }))
    try {
      await upsertMcpAllowlist({
        server_id: tool.server_id,
        tool_name: tool.name,
        allowed: next,
      })
    } catch {
      setEnabled((prev) => ({ ...prev, [tool.name]: !next }))
    }
  }

  return (
    <div className="grid gap-4">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-primary">Herramientas MCP</h3>
        <p className="mt-1 text-xs leading-4 text-muted-foreground">
          {tools.length} herramientas registradas en el router MCP
        </p>
      </div>

      <div className="space-y-1">
        {sortedCategories.map((category) => {
          const group = groups.get(category)!
          const groupEnabled = group.filter((t) => enabled[t.name] !== false).length
          const expanded = expandedGroups.includes(category)

          return (
            <div key={category} className="overflow-hidden rounded-lg border border-border bg-card/70">
              <button type="button" onClick={() =>
                setExpandedGroups((prev) => prev.includes(category)
                  ? prev.filter((g) => g !== category)
                  : [...prev, category]
                )}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/50">
                {expanded
                  ? <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
                  : <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />}
                <span className="text-sm font-semibold">{CATEGORY_ICONS[category] ?? "🔧"} {category}</span>
                <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">
                  {groupEnabled}/{group.length}
                  <span className={cn("ml-1.5 inline-block size-2 rounded-full", groupEnabled > 0 ? "bg-emerald-500" : "bg-gray-400")} />
                </span>
              </button>

              {expanded && (
                <div className="divide-y divide-border border-t border-border">
                  <div className="flex items-center gap-2 px-3 py-1.5">
                    <button type="button" onClick={() => toggleAllInGroup(category, true)}
                      className="text-xs text-muted-foreground hover:text-foreground">Habilitar todos</button>
                    <span className="text-muted-foreground">·</span>
                    <button type="button" onClick={() => toggleAllInGroup(category, false)}
                      className="text-xs text-muted-foreground hover:text-foreground">Deshabilitar todos</button>
                  </div>
                  {group.map((tool) => {
                    const isEnabled = enabled[tool.name] !== false
                    return (
                      <div key={tool.id}
                        className={cn("flex items-center gap-3 px-3 py-2 transition-colors", !isEnabled && "opacity-50")}>
                        <button type="button" onClick={() => toggleTool(tool)}
                          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                          {isEnabled
                            ? <ToggleRightIcon className="size-5 text-primary" />
                            : <ToggleLeftIcon className="size-5" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{tool.name}</p>
                            <span className={cn(
                              "rounded px-1.5 py-0.5 text-[10px] font-medium",
                              tool.status === "ready" && "bg-emerald-500/10 text-emerald-600",
                              tool.status === "guarded" && "bg-amber-500/10 text-amber-600",
                              tool.status === "planned" && "bg-gray-500/10 text-gray-500"
                            )}>{tool.status}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{tool.server_id} · {tool.args ?? "—"}</p>
                          <p className="text-xs text-muted-foreground/70">→ {tool.result ?? "—"}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}