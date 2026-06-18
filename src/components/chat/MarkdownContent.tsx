import { useState, useMemo, memo } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { CodeBlock } from "@/components/chat/CodeBlock"
import { cn } from "@/lib/utils"
import {
  looksLikeAsciiChart,
  parseAsciiChart,
  looksLikeMatplotlibChart,
  parseMatplotlibChart,
  BarChartBlock,
  LineChartBlock,
  PieChartBlock,
  AreaChartBlock,
  RadarChartBlock,
} from "./charts"

interface MarkdownContentProps {
  content: string
  isStreaming?: boolean
}

type Segment =
  | { type: "md"; text: string }
  | { type: "chart"; code: string }

function splitContent(content: string): Segment[] {
  const segments: Segment[] = []
  const blocks = content.split(/\n\n+/)
  const chartBlock: string[] = []

  function flushChart() {
    if (chartBlock.length > 0) {
      const code = chartBlock.join("\n\n")
      if (looksLikeAsciiChart(code)) {
        segments.push({ type: "chart", code })
      } else {
        segments.push({ type: "md", text: code })
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

function StreamingContent({ content }: { content: string }) {
  const lines = useMemo(() => {
    const trimmed = content.replace(/\n{3,}/g, "\n\n")
    return trimmed.split("\n").filter(Boolean)
  }, [content])

  if (lines.length <= 3) {
    return <p className="mb-2 leading-relaxed whitespace-pre-wrap">{content}</p>
  }

  return (
    <>
      {lines.slice(0, 3).map((line, i) => (
        <p key={i} className="mb-1 leading-relaxed whitespace-pre-wrap last:mb-0">
          {line}
        </p>
      ))}
      <span className="text-xs text-muted-foreground">···</span>
    </>
  )
}

const RenderedContent = memo(function RenderedContent({
  content,
}: {
  content: string
}) {
  const segments = useMemo(() => splitContent(content), [content])

  return (
    <>
      {segments.map((seg, i) =>
        seg.type === "chart" ? (
          <ChartFromText key={i} code={seg.code} />
        ) : (
          <ReactMarkdown
            key={i}
            remarkPlugins={[remarkGfm]}
            components={{
              code({ className, children, inline }) {
                return (
                  <CodeBlock className={className} inline={inline}>
                    {String(children)}
                  </CodeBlock>
                )
              },
              pre({ children }) {
                return <>{children}</>
              },
              p({ children }) {
                return <p className="text-[14px] text-stone-700 leading-[1.75] mb-3 last:mb-0">{children}</p>
              },
              h1({ children }) {
                return <h1 className="text-[18px] font-medium text-stone-800 mt-5 mb-2">{children}</h1>
              },
              h2({ children }) {
                return <h2 className="text-[16px] font-medium text-stone-800 mt-4 mb-2">{children}</h2>
              },
              h3({ children }) {
                return <h3 className="text-[14px] font-medium text-stone-800 mt-3 mb-1.5">{children}</h3>
              },
              ul({ children }) {
                return <ul className="list-none pl-0 mb-3 space-y-1">{children}</ul>
              },
              ol({ children }) {
                return <ol className="list-decimal list-inside mb-3 space-y-1 text-[14px] text-stone-700">{children}</ol>
              },
              li({ children }) {
                return (
                  <li className="flex items-start gap-2 text-[14px] text-stone-700 leading-[1.7]">
                    <span className="w-1.5 h-1.5 rounded-full bg-stone-400 mt-[9px] flex-shrink-0" />
                    <span>{children}</span>
                  </li>
                )
              },
              blockquote({ children }) {
                return (
                  <blockquote className="border-l-2 border-stone-300 pl-4 my-3 text-stone-500 italic text-[13px]">
                    {children}
                  </blockquote>
                )
              },
              table({ children }) {
                return (
                  <div className="overflow-x-auto my-3">
                    <table className="w-full text-[13px] border-collapse">{children}</table>
                  </div>
                )
              },
              thead({ children }) {
                return <thead className="border-b border-stone-200">{children}</thead>
              },
              th({ children }) {
                return (
                  <th className="text-left px-3 py-2 text-[12px] font-medium text-stone-500 uppercase tracking-wide">
                    {children}
                  </th>
                )
              },
              td({ children }) {
                return (
                  <td className="px-3 py-2 text-stone-700 border-b border-stone-100">
                    {children}
                  </td>
                )
              },
              tr({ children }) {
                return <tr className="hover:bg-stone-50 transition-colors">{children}</tr>
              },
              a({ href, children }) {
                return (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-700 underline underline-offset-2 hover:text-amber-600 transition-colors"
                  >
                    {children}
                  </a>
                )
              },
              hr() {
                return <hr className="border-stone-200 my-4" />
              },
              strong({ children }) {
                return <strong className="font-medium text-stone-800">{children}</strong>
              },
              em({ children }) {
                return <em className="italic text-stone-600">{children}</em>
              },
            }}
          >
            {seg.text}
          </ReactMarkdown>
        )
      )}
    </>
  )
})

export const MarkdownContent = memo(function MarkdownContent({
  content,
  isStreaming,
}: MarkdownContentProps) {
  return (
    <div className={cn(
      "space-y-2 text-sm leading-relaxed text-foreground break-words overflow-wrap-anywhere",
    )}>
      {isStreaming ? (
        <StreamingContent content={content} />
      ) : (
        <RenderedContent content={content} />
      )}
      {isStreaming && (
        <span className="inline-block w-[3px] h-[1em] ml-0.5 bg-emerald-500 animate-pulse align-middle" />
      )}
    </div>
  )
})

function ChartFromText({ code }: { code: string }) {
  const parsed = parseAsciiChart(code)
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
