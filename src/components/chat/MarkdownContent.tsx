import { cn } from "@/lib/utils"
import { code } from "@streamdown/code"
import { math } from "@streamdown/math"
import { mermaid } from "@streamdown/mermaid"
import { memo, useMemo } from "react"
import { Streamdown } from "streamdown"
import {
  AreaChartBlock,
  BarChartBlock,
  LineChartBlock,
  PieChartBlock,
  RadarChartBlock,
  looksLikeAsciiChart,
  parseAsciiChart,
} from "./charts"

interface MarkdownContentProps {
  content: string
  isStreaming?: boolean
}

type Segment = { type: "md"; text: string } | { type: "chart"; code: string }

function splitContent(content: string): Segment[] {
  if (!content) return []
  const segments: Segment[] = []
  const blocks = content.split(/\n\n+/)
  const chartBlock: string[] = []

  function flushChart() {
    if (chartBlock.length > 0) {
      const codeStr = chartBlock.join("\n\n")
      if (looksLikeAsciiChart(codeStr)) {
        segments.push({ type: "chart", code: codeStr })
      } else {
        segments.push({ type: "md", text: codeStr })
      }
      chartBlock.length = 0
    }
  }

  for (const block of blocks) {
    const looksLike = looksLikeAsciiChart(block)
    const prevLooksLike = chartBlock.length > 0

    if (looksLike) {
      chartBlock.push(block)
    } else if (prevLooksLike) {
      flushChart()
      segments.push({ type: "md", text: block })
    } else {
      segments.push({ type: "md", text: block })
    }
  }
  flushChart()

  return segments
}

function ChartFromText({ code: chartCode }: { code: string }) {
  const parsed = parseAsciiChart(chartCode)
  if (parsed.type === "area" && parsed.series.length > 0) {
    return <AreaChartBlock title={parsed.title} series={parsed.series} labels={parsed.labels} />
  }
  if (parsed.type === "radar" && parsed.entries.length > 0) {
    return <RadarChartBlock title={parsed.title} entries={parsed.entries} />
  }
  if (parsed.type === "line" && parsed.series.length > 0) {
    return <LineChartBlock title={parsed.title} series={parsed.series} labels={parsed.labels} />
  }
  if (parsed.type === "pie" && parsed.entries.length > 0) {
    return <PieChartBlock title={parsed.title} entries={parsed.entries} />
  }
  if (parsed.entries.length > 0) {
    return <BarChartBlock title={parsed.title} entries={parsed.entries} />
  }
  return null
}

const streamdownPlugins = {
  code,
  math,
  mermaid,
}

const streamdownControls = {
  code: true,
  table: true,
  mermaid: true,
}

export const MarkdownContent = memo(function MarkdownContent({
  content,
  isStreaming,
}: MarkdownContentProps) {
  const segments = useMemo(() => splitContent(content), [content])

  return (
    <div
      className={cn(
        "space-y-3 text-[14px] leading-relaxed text-foreground break-words overflow-wrap-anywhere prose dark:prose-invert max-w-none",
        "prose-headings:font-medium prose-h1:text-[18px] prose-h2:text-[16px] prose-h3:text-[14px]",
        "prose-p:leading-[1.75] prose-p:my-2 prose-pre:my-3 prose-pre:rounded-xl",
        "prose-a:text-emerald-600 dark:prose-a:text-emerald-400 prose-a:underline-offset-2"
      )}
    >
      {segments.map((seg, i) =>
        seg.type === "chart" ? (
          <ChartFromText key={`chart-${i}`} code={seg.code} />
        ) : (
          <Streamdown
            key={`stream-${i}`}
            mode={isStreaming ? "streaming" : "static"}
            plugins={streamdownPlugins}
            controls={streamdownControls}
          >
            {seg.text}
          </Streamdown>
        )
      )}
      {isStreaming && (
        <span className="inline-block w-[3px] h-[1em] ml-0.5 bg-emerald-500 animate-pulse align-middle" />
      )}
    </div>
  )
})
