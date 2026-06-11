import { useState, useRef, useMemo, useCallback } from "react"
import { useTokenTimeline } from "@/features/workspace/analysis/useAnalysis"
import type { Timeframe, TokenBucket } from "@/types/analysis"

interface TokenChartProps {
  timeframe: Timeframe
  onTimeframeChange: (tf: Timeframe) => void
}

const TIMEFRAMES: { key: Timeframe; label: string }[] = [
  { key: "hoy", label: "Hoy" },
  { key: "7d", label: "7 días" },
  { key: "30d", label: "30 días" },
]

export function TokenChart({ timeframe, onTimeframeChange }: TokenChartProps) {
  const { data, loading } = useTokenTimeline("project-default", timeframe)
  const chartRef = useRef<HTMLDivElement>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [tooltip, setTooltip] = useState<{ bucket: TokenBucket; x: number; y: number } | null>(null)

  const items = data ?? []
  const maxTokens = useMemo(
    () => (items.length > 1 ? Math.max(...items.map((d) => d.total_tokens)) : 0),
    [items]
  )
  const hasData = items.length > 1

  const points = useMemo(
    () =>
      items
        .map((item, i) => {
          const x = (i / (items.length - 1)) * 100
          const y = 100 - (item.total_tokens / (maxTokens || 1)) * 86
          return `${x},${y}`
        })
        .join(" "),
    [items, maxTokens]
  )

  const showTooltip = useCallback((i: number, e: React.MouseEvent) => {
    const rect = chartRef.current?.getBoundingClientRect()
    if (rect && items[i]) {
      setTooltip({
        bucket: items[i],
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    }
    setHoverIndex(i)
  }, [items])

  const hideTooltip = useCallback(() => {
    setHoverIndex(null)
    setTooltip(null)
  }, [])

  function onSvgHover(e: React.MouseEvent<SVGSVGElement>) {
    if (!items.length) return
    const rect = chartRef.current?.getBoundingClientRect()
    if (!rect) return
    const relX = e.clientX - rect.left
    const barW = (rect.width - 24) / items.length
    const i = Math.min(items.length - 1, Math.max(0, Math.floor((relX - 12) / barW)))
    showTooltip(i, e)
  }

  const yLabels = useMemo(() => {
    if (!maxTokens) return []
    const steps = [1, 0.75, 0.5, 0.25, 0]
    return steps.map((s) => ({
      value: Math.round(maxTokens * s),
      topPct: 100 - s * 86,
    }))
  }, [maxTokens])

  return (
    <section className="rounded-lg border border-border/80 bg-card/95 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
        <div>
          <h2 className="text-sm font-semibold">Consumo por hora</h2>
          <p className="text-xs text-muted-foreground">
            Tokens enviados, recibidos y tool-calls asociados.
          </p>
        </div>
        <div className="flex gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.key}
              onClick={() => onTimeframeChange(tf.key)}
              className={`rounded-md px-1.5 py-0.5 text-[0.68rem] font-medium transition-colors ${
                timeframe === tf.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary/10 text-primary hover:bg-primary/20"
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 p-3">
        {loading ? (
          <div className="h-56 animate-pulse rounded-lg border border-border bg-background/75 p-3" />
        ) : (
          <div className="relative" ref={chartRef}>
            <div className="flex h-52 rounded-lg border border-border bg-background/75">
              <div className="relative w-9 shrink-0">
                {hasData && yLabels.map((l) => (
                  <span
                    key={l.topPct}
                    className="absolute right-1.5 text-[0.6rem] leading-none text-muted-foreground -translate-y-full"
                    style={{ top: `${l.topPct}%` }}
                  >
                    {l.value >= 1000 ? `${(l.value / 1000).toFixed(0)}k` : l.value}
                  </span>
                ))}
              </div>
              <div className="relative flex-1">
                {hasData ? (
                  <svg
                    className="size-full"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    onMouseMove={onSvgHover}
                    onMouseLeave={hideTooltip}
                  >
                    {yLabels.map((l) => (
                      <line
                        key={l.topPct}
                        x1="0" y1={l.topPct} x2="100" y2={l.topPct}
                        stroke="#f0ece4" strokeWidth="0.3"
                      />
                    ))}
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
            </div>

            {hasData && (
              <div className="mt-2 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
                {items.map((item, i) => {
                  const inputPct = maxTokens ? (item.input_tokens / maxTokens) * 100 : 0
                  const outputPct = maxTokens ? (item.output_tokens / maxTokens) * 100 : 0
                  return (
                    <div
                      key={item.hora}
                      className="text-center cursor-pointer"
                      onMouseEnter={(e) => showTooltip(i, e)}
                      onMouseMove={(e) => showTooltip(i, e)}
                      onMouseLeave={hideTooltip}
                    >
                      <div className="mx-auto flex h-14 w-full items-end rounded-sm border border-border bg-background/75 px-px overflow-hidden">
                        <div className="flex w-full gap-px items-end">
                          <div
                            className="w-1/2 rounded-l-sm bg-primary/40 transition-all duration-200"
                            style={{
                              height: inputPct > 0 ? `${inputPct}%` : "2px",
                              opacity: inputPct > 0 ? 1 : 0.3,
                            }}
                          />
                          <div
                            className="w-1/2 rounded-r-sm bg-primary transition-all duration-200"
                            style={{
                              height: outputPct > 0 ? `${outputPct}%` : "2px",
                              opacity: outputPct > 0 ? 1 : 0.3,
                            }}
                          />
                        </div>
                      </div>
                      <p className="mt-0.5 text-[0.55rem] text-muted-foreground truncate leading-tight">
                        {item.hora}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}

            {tooltip && (
              <div
                className="pointer-events-none absolute z-50 rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg"
                style={{ left: tooltip.x, top: tooltip.y, transform: "translate(-50%, -110%)" }}
              >
                <p className="font-semibold text-foreground">{tooltip.bucket.hora}</p>
                <p className="text-muted-foreground">Input: {tooltip.bucket.input_tokens.toLocaleString("es-CO")}</p>
                <p className="text-muted-foreground">Output: {tooltip.bucket.output_tokens.toLocaleString("es-CO")}</p>
                <p className="font-medium text-foreground">Total: {tooltip.bucket.total_tokens.toLocaleString("es-CO")}</p>
              </div>
            )}

            <div className="mt-2 flex items-center gap-4 text-[0.62rem] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="inline-block size-2.5 rounded-sm bg-primary/40" />
                <span>Input</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block size-2.5 rounded-sm bg-primary" />
                <span>Output</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}