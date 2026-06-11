import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import type { ChartEntry } from "./chart-utils"
import { chartColors, ChartTooltip } from "./shared"

export function PieChartBlock({
  title,
  entries,
}: {
  title: string
  entries: ChartEntry[]
}) {
  const total = entries.reduce((s, e) => s + e.value, 0) || 1
  const data = entries.map((e) => ({
    name: e.label,
    value: e.value,
    pct: Math.round((e.value / total) * 100),
  }))

  return (
    <div className="my-3 rounded-xl border border-border/60 bg-background/95 p-4">
      {title && (
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          {title}
        </p>
      )}
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, i) => (
              <Cell key={entry.name} fill={chartColors[i % chartColors.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: "11px" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
