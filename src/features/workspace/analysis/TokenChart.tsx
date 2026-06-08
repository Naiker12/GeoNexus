import { tokenTimeline } from "@/features/workspace/analysis/analysis-data"

export function TokenChart() {
  const hasData = tokenTimeline.length > 1
  const maxTokens = hasData
    ? Math.max(...tokenTimeline.map((item) => item.tokens))
    : 0
  const points = tokenTimeline
    .map((item, index) => {
      const x = (index / (tokenTimeline.length - 1)) * 100
      const y = 100 - (item.tokens / maxTokens) * 86
      return `${x},${y}`
    })
    .join(" ")

  return (
    <section className="overflow-hidden rounded-lg border border-border/80 bg-card/95 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
        <div>
          <h2 className="text-sm font-semibold">Consumo por hora</h2>
          <p className="text-xs text-muted-foreground">
            Tokens enviados, tokens recibidos y tool-calls asociados.
          </p>
        </div>
        <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[0.68rem] font-medium text-primary">
          Hoy
        </span>
      </div>
      <div className="grid gap-3 p-3">
        <div className="h-56 rounded-lg border border-border bg-background/75 p-3">
          {hasData ? (
            <svg
              className="size-full overflow-visible"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              role="img"
              aria-label="Linea de consumo de tokens por hora"
            >
              <defs>
                <linearGradient id="tokenFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon points={`0,100 ${points} 100,100`} fill="url(#tokenFill)" />
              <polyline
                points={points}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="2.5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Sin consumo registrado
            </div>
          )}
        </div>
        {hasData ? (
          <div className="grid grid-cols-7 gap-2">
          {tokenTimeline.map((item) => (
            <div key={item.hour} className="text-center">
              <div className="mx-auto flex h-16 w-full items-end rounded-md border border-border bg-background/75 px-1">
                <div
                  className="w-full rounded-sm bg-primary/80"
                  style={{ height: `${(item.tokens / maxTokens) * 100}%` }}
                />
              </div>
              <p className="mt-1 text-[0.68rem] text-muted-foreground">{item.hour}</p>
            </div>
          ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}
