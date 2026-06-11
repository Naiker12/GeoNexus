import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import type { DataSeries } from "./chart-utils"
import { chartColors, ChartTooltip } from "./shared"

export function AreaChartBlock({
  title,
  series,
  labels,
}: {
  title: string
  series: DataSeries[]
  labels: string[]
}) {
  const maxLen = Math.max(...series.map((s) => s.values.length), 0)
  const xLabels = labels.length > 0 ? labels : Array.from({ length: maxLen }, (_, i) => String(i + 1))

  const data = xLabels.map((label, i) => {
    const point: Record<string, string | number> = { name: label }
    for (const s of series) {
      point[s.label] = s.values[i] ?? 0
    }
    return point
  })

  const allValues = series.flatMap((s) => s.values).filter((v) => !isNaN(v))
  const maxVal = Math.max(...allValues, 1)
  const niceMax = Math.ceil(maxVal / 10) * 10 || 100

  return (
    <div className="my-3 rounded-xl border border-border/60 bg-background/95 p-4">
      {title && (
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          {title}
        </p>
      )}
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
          <defs>
            {series.map((s, i) => (
              <linearGradient key={s.label} id={`areaGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColors[i % chartColors.length]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={chartColors[i % chartColors.length]} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
          <YAxis domain={[0, niceMax]} tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
          <Tooltip content={<ChartTooltip />} />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: "11px" }} />}
          {series.map((s, i) => (
            <Area
              key={s.label}
              type="monotone"
              dataKey={s.label}
              stroke={chartColors[i % chartColors.length]}
              strokeWidth={2}
              fill={`url(#areaGrad-${i})`}
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
