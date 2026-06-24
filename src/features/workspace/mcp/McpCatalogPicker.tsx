import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/Button"
import { listCuratedMcpServers, installCuratedMcpServer, type CuratedMcpEntry } from "@/api/mcp"

const categoryLabels: Record<string, string> = {
  storage: "Almacenamiento",
  search: "Busqueda",
  geo: "Geoespacial",
  productivity: "Productividad",
  dev: "Desarrollo",
  ai: "IA / LLM",
  browser: "Navegador",
  data: "Datos",
  communication: "Comunicacion",
}

export function McpCatalogPicker() {
  const [servers, setServers] = useState<CuratedMcpEntry[]>([])
  const [installing, setInstalling] = useState<string | null>(null)
  const [filter, setFilter] = useState("")

  useEffect(() => {
    listCuratedMcpServers().then(setServers)
  }, [])

  const handleInstall = useCallback(async (id: string) => {
    setInstalling(id)
    try {
      await installCuratedMcpServer(id)
    } catch (e) {
      console.error("Error installing curated MCP server:", e)
    } finally {
      setInstalling(null)
    }
  }, [])

  const categories = [...new Set(servers.map(s => s.category))]
  const filtered = servers.filter(s =>
    !filter || s.name.toLowerCase().includes(filter.toLowerCase()) ||
    s.description.toLowerCase().includes(filter.toLowerCase()) ||
    s.tags.some(t => t.toLowerCase().includes(filter.toLowerCase()))
  )

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-primary">
          Catalogo de servidores MCP
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {servers.length} servidores curados disponibles
        </p>
      </div>

      <input
        className="w-full rounded border border-border bg-secondary px-3 py-1.5 text-xs outline-none focus:border-primary"
        placeholder="Buscar servidores..."
        value={filter}
        onChange={e => setFilter(e.target.value)}
      />

      <div className="max-h-96 space-y-4 overflow-y-auto pr-1">
        {categories.map(cat => {
          const catServers = filtered.filter(s => s.category === cat)
          if (catServers.length === 0) return null
          return (
            <div key={cat}>
              <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {categoryLabels[cat] || cat}
              </h4>
              <div className="grid gap-2">
                {catServers.map(server => (
                  <div
                    key={server.id}
                    className="flex items-start gap-3 rounded border border-border bg-secondary/50 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">{server.name}</span>
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                          {server.transport}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground line-clamp-2">
                        {server.description}
                      </p>
                      {server.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {server.tags.map(tag => (
                            <span key={tag} className="rounded bg-accent/30 px-1 py-0.5 text-[10px] text-accent-foreground">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      variant={installing === server.id ? "secondary" : "default"}
                      size="sm"
                      disabled={installing === server.id}
                      onClick={() => handleInstall(server.id)}
                    >
                      {installing === server.id ? "Instalando..." : "Instalar"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
