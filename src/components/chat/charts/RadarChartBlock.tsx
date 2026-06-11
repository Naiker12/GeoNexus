import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from "recharts"
import type { ChartEntry } from "./chart-utils"
import { chartColors } from "./shared"

export function RadarChartBlock({
  title,
  entries,
}: {
  title: string
  entries: ChartEntry[]
}) {
  const maxVal = Math.max(...entries.map((e) => e.value), 1)
  const niceMax = Math.ceil(maxVal / 10) * 10 || 100

  const data = entries.map((e) => ({
    subject: e.label,
    value: e.value,
    fullMark: niceMax,
  }))

  return (
    <div className="my-3 rounded-xl border border-border/60 bg-background/95 p-4">
      {title && (
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          {title}
        </p>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
          <PolarGrid stroke="var(--color-border)" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fontSize: 10 }}
            stroke="var(--color-muted-foreground)"
          />
          <PolarRadiusAxis
            domain={[0, niceMax]}
            tick={{ fontSize: 9 }}
            stroke="var(--color-muted-foreground)"
          />
          <Radar
            dataKey="value"
            stroke={chartColors[0]}
            fill={chartColors[0]}
            fillOpacity={0.15}
            strokeWidth={2}
          />
          <Legend wrapperStyle={{ fontSize: "11px" }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
