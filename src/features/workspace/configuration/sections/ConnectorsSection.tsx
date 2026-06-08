const connectorItems: {
  name: string
  role: string
  endpoint: string
  status: string
}[] = []

export function ConnectorsSection() {
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
        {connectorItems.length ? (
          connectorItems.map((item) => (
            <article
              key={item.name}
              className="rounded-lg border border-border bg-card/70 px-3 py-2.5"
            >
              <p className="truncate text-sm font-medium">{item.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {item.role} - {item.endpoint} - {item.status}
              </p>
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
