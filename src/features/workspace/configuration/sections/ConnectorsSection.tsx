import * as React from "react"
import { listConnectorConfigs } from "@/api/connector"
import type { ConnectorConfig } from "@/types/connector"

export function ConnectorsSection() {
  const [configs, setConfigs] = React.useState<ConnectorConfig[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    listConnectorConfigs().then((list) => {
      setConfigs(list)
      setLoading(false)
    })
  }, [])

  return (
    <div className="grid gap-4">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-primary">
          Conectores IA
        </h3>
        <p className="mt-1 text-xs leading-4 text-muted-foreground">
          Proveedores, servidores MCP y servicios conectados al workspace.
        </p>
      </div>

      <div className="grid gap-2">
        {loading ? (
          <div className="rounded-lg border border-border bg-card/70 px-3 py-8 text-center text-sm text-muted-foreground">
            Cargando conectores...
          </div>
        ) : configs.length > 0 ? (
          configs.map((cfg) => (
            <article
              key={cfg.id}
              className="rounded-lg border border-border bg-card/70 px-3 py-2.5"
            >
              <div className="flex items-center justify-between">
                <p className="truncate text-sm font-medium">{cfg.display_name}</p>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    cfg.is_active
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {cfg.is_active ? "Activo" : "Inactivo"}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <span>Tipo: {cfg.provider}</span>
                {cfg.root_path && <span className="truncate">Ruta: {cfg.root_path}</span>}
                {cfg.base_url && <span className="truncate">URL: {cfg.base_url}</span>}
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-lg border border-border bg-card/70 px-3 py-8 text-center text-sm text-muted-foreground">
            Sin conectores IA configurados
          </div>
        )}
      </div>
    </div>
  )
}
