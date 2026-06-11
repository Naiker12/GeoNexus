import * as React from "react"
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ToggleLeftIcon,
  ToggleRightIcon,
} from "lucide-react"

import { mcpTools } from "@/features/workspace/mcp/mcp-data"
import { cn } from "@/lib/utils"

const categoryIcons: Record<string, string> = {
  GIS: "📍",
  Memoria: "🧠",
  Datos: "🗄️",
  IA: "🤖",
  UI: "🖥️",
}

const categoryOrder = ["GIS", "Búsqueda", "Código", "Documentos", "Memoria", "Datos", "IA", "UI"]

type ToolEntry = {
  name: string
  server: string
  category: string
  args: string
  result: string
  status: "ready" | "guarded" | "planned"
}

const toolList: ToolEntry[] = mcpTools.map((t) => ({
  name: t.name,
  server: t.server,
  category: t.category,
  args: t.args,
  result: t.result,
  status: t.status,
}))

function groupTools(tools: ToolEntry[]): Map<string, ToolEntry[]> {
  const groups = new Map<string, ToolEntry[]>()
  for (const tool of tools) {
    const existing = groups.get(tool.category) ?? []
    existing.push(tool)
    groups.set(tool.category, existing)
  }
  return groups
}

const STORAGE_KEY = "geonexus.gisTools"

function loadEnabled(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function saveEnabled(enabled: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(enabled))
  } catch {}
}

export function GisToolsPanel() {
  const groups = React.useMemo(() => groupTools(toolList), [])
  const sortedCategories = React.useMemo(
    () =>
      Array.from(groups.keys()).sort(
        (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
      ),
    [groups]
  )

  const [expandedGroups, setExpandedGroups] = React.useState<string[]>(
    sortedCategories
  )
  const [enabled, setEnabled] = React.useState<Record<string, boolean>>(
    loadEnabled
  )

  React.useEffect(() => {
    setExpandedGroups((prev) => {
      const merged = new Set([...prev, ...sortedCategories])
      return Array.from(merged)
    })
  }, [sortedCategories])

  const toggleAllInGroup = (category: string, on: boolean) => {
    const group = groups.get(category)
    if (!group) return
    setEnabled((prev) => {
      const next = { ...prev }
      for (const tool of group) {
        next[tool.name] = on
      }
      saveEnabled(next)
      return next
    })
  }

  const toggleTool = (name: string) => {
    setEnabled((prev) => {
      const next = { ...prev, [name]: !prev[name] }
      saveEnabled(next)
      return next
    })
  }

  return (
    <div className="grid gap-4">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-primary">
          Herramientas MCP
        </h3>
        <p className="mt-1 text-xs leading-4 text-muted-foreground">
          {toolList.length} herramientas registradas en el router MCP
        </p>
      </div>

      <div className="space-y-1">
        {sortedCategories.map((category) => {
          const group = groups.get(category)!
          const groupEnabled = group.filter(
            (t) => enabled[t.name] !== false
          ).length
          const expanded = expandedGroups.includes(category)

          return (
            <div
              key={category}
              className="overflow-hidden rounded-lg border border-border bg-card/70"
            >
              <button
                type="button"
                onClick={() =>
                  setExpandedGroups((prev) =>
                    prev.includes(category)
                      ? prev.filter((g) => g !== category)
                      : [...prev, category]
                  )
                }
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
              >
                {expanded ? (
                  <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span className="text-sm font-semibold">
                  {categoryIcons[category] ?? "🔧"} {category}
                </span>
                <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">
                  {groupEnabled}/{group.length}
                  <span
                    className={cn(
                      "ml-1.5 inline-block size-2 rounded-full",
                      groupEnabled > 0 ? "bg-emerald-500" : "bg-gray-400"
                    )}
                  />
                </span>
              </button>

              {expanded && (
                <div className="divide-y divide-border border-t border-border">
                  <div className="flex items-center gap-2 px-3 py-1.5">
                    <button
                      type="button"
                      onClick={() => toggleAllInGroup(category, true)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Habilitar todos
                    </button>
                    <span className="text-muted-foreground">·</span>
                    <button
                      type="button"
                      onClick={() => toggleAllInGroup(category, false)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Deshabilitar todos
                    </button>
                  </div>
                  {group.map((tool) => {
                    const isEnabled = enabled[tool.name] !== false
                    return (
                      <div
                        key={tool.name}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 transition-colors",
                          !isEnabled && "opacity-50"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => toggleTool(tool.name)}
                          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {isEnabled ? (
                            <ToggleRightIcon className="size-5 text-primary" />
                          ) : (
                            <ToggleLeftIcon className="size-5" />
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{tool.name}</p>
                            <span
                              className={cn(
                                "rounded px-1.5 py-0.5 text-[10px] font-medium",
                                tool.status === "ready" &&
                                  "bg-emerald-500/10 text-emerald-600",
                                tool.status === "guarded" &&
                                  "bg-amber-500/10 text-amber-600",
                                tool.status === "planned" &&
                                  "bg-gray-500/10 text-gray-500"
                              )}
                            >
                              {tool.status}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {tool.server} · {tool.args}
                          </p>
                          <p className="text-xs text-muted-foreground/70">
                            → {tool.result}
                          </p>
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
