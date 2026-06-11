import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import type { ChartEntry } from "./chart-utils"
import { ChartTooltip } from "./shared"

export function BarChartBlock({
  title,
  entries,
}: {
  title: string
  entries: ChartEntry[]
}) {
  const maxVal = Math.max(...entries.map((e) => e.value), 1)
  const niceMax = Math.ceil(maxVal / 10) * 10 || 100

  const data = entries.map((e) => ({
    name: e.label,
    value: e.value,
    fill: valueColor(e.value, maxVal),
  }))

  return (
    <div className="my-3 rounded-xl border border-border/60 bg-background/95 p-4">
      {title && (
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          {title}
        </p>
      )}
      <ResponsiveContainer width="100%" height={Math.max(180, entries.length * 32)}>
        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
          <XAxis type="number" domain={[0, niceMax]} tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
          <YAxis
            type="category"
            dataKey="name"
            width={180}
            tick={{ fontSize: 11 }}
            stroke="var(--color-muted-foreground)"
            tickFormatter={(val) => val.length > 28 ? val.substring(0, 26) + "..." : val}
          />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function valueColor(value: number, max: number): string {
  const pct = value / max
  if (pct < 0.4) return "var(--color-emerald-500, #10b981)"
  if (pct < 0.7) return "var(--color-amber-500, #f59e0b)"
  return "var(--color-red-500, #ef4444)"
}
