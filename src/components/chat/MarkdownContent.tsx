import { useState, useMemo, memo } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import { Check, Copy } from "lucide-react"

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

const LANGUAGE_LABELS: Record<string, string> = {
  js: "JavaScript",
  jsx: "JSX",
  ts: "TypeScript",
  tsx: "TSX",
  py: "Python",
  rs: "Rust",
  go: "Go",
  rb: "Ruby",
  java: "Java",
  kt: "Kotlin",
  swift: "Swift",
  cpp: "C++",
  c: "C",
  cs: "C#",
  php: "PHP",
  html: "HTML",
  css: "CSS",
  scss: "SCSS",
  json: "JSON",
  yaml: "YAML",
  yml: "YAML",
  xml: "XML",
  sql: "SQL",
  sh: "Shell",
  bash: "Bash",
  zsh: "Zsh",
  powershell: "PowerShell",
  ps1: "PowerShell",
  dockerfile: "Dockerfile",
  diff: "Diff",
  graphql: "GraphQL",
  md: "Markdown",
  txt: "Text",
  env: ".env",
  ignore: ".gitignore",
}

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
              p({ children }) {
                return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
              },
              strong({ children }) {
                return (
                  <strong className="font-medium text-foreground">
                    {children}
                  </strong>
                )
              },
              ul({ children }) {
                return <ul className="mb-2 pl-5 list-disc space-y-0.5">{children}</ul>
              },
              ol({ children }) {
                return (
                  <ol className="mb-2 pl-5 list-decimal space-y-0.5">{children}</ol>
                )
              },
              li({ children }) {
                return <li className="leading-relaxed">{children}</li>
              },
              h1({ children }) {
                return (
                  <h1 className="text-base font-medium mt-4 mb-2">{children}</h1>
                )
              },
              h2({ children }) {
                return (
                  <h2 className="text-sm font-medium mt-3 mb-1.5">{children}</h2>
                )
              },
              h3({ children }) {
                return <h3 className="text-sm font-medium mt-2 mb-1">{children}</h3>
              },
              a({ href, children }) {
                return (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 no-underline hover:underline dark:text-emerald-400"
                  >
                    {children}
                  </a>
                )
              },
              table({ children }) {
                return (
                  <div className="overflow-x-auto my-3">
                    <table className="w-full border-collapse text-[13px]">
                      {children}
                    </table>
                  </div>
                )
              },
              thead({ children }) {
                return <thead className="bg-muted/50">{children}</thead>
              },
              th({ children }) {
                return (
                  <th className="border border-border px-3 py-1.5 text-left font-medium text-[12px]">
                    {children}
                  </th>
                )
              },
              td({ children }) {
                return (
                  <td className="border border-border px-3 py-1.5 text-[12px]">
                    {children}
                  </td>
                )
              },
              tr({ children }) {
                return <tr className="even:bg-muted/20">{children}</tr>
              },
              code({ className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || "")
                const language = match?.[1] ?? ""
                const codeString = String(children).replace(/\n$/, "")

                if (!match) {
                  return (
                    <code
                      className="rounded bg-muted px-1.5 py-0.5 text-[13px] font-normal text-foreground"
                      {...props}
                    >
                      {children}
                    </code>
                  )
                }

                return <CodeBlock language={language} code={codeString} />
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
    <div
      className={cn(
        "space-y-2 text-sm leading-relaxed text-foreground break-words overflow-wrap-anywhere"
      )}
    >
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

function CodeBlock({
  language,
  code,
}: {
  language: string
  code: string
}) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard not available
    }
  }

  if (looksLikeMatplotlibChart(code)) {
    const parsed = parseMatplotlibChart(code)
    if (parsed.type === "pie" && parsed.entries.length > 0) {
      return <PieChartBlock title={parsed.title} entries={parsed.entries} />
    }
    if (parsed.type === "bar" && parsed.entries.length > 0) {
      return <BarChartBlock title={parsed.title} entries={parsed.entries} />
    }
    if (parsed.type === "line" && parsed.series.length > 0) {
      return <LineChartBlock title={parsed.title} series={parsed.series} labels={parsed.labels} />
    }
  }

  if (looksLikeAsciiChart(code)) {
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
  }

  const label = LANGUAGE_LABELS[language] || language || "code"

  return (
    <div className="my-3 rounded-lg border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-1.5 bg-muted border-b border-border">
        <div className="flex items-center gap-2">
          <span className="flex gap-1">
            <span className="size-2.5 rounded-full bg-red-500" />
            <span className="size-2.5 rounded-full bg-yellow-500" />
            <span className="size-2.5 rounded-full bg-green-500" />
          </span>
          <span className="text-[11px] font-mono text-muted-foreground">
            {label}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Copiar código"
        >
          {copied ? (
            <>
              <Check className="size-3 text-emerald-500" />
              <span className="text-emerald-500">Copiado</span>
            </>
          ) : (
            <>
              <Copy className="size-3" />
              <span>Copiar</span>
            </>
          )}
        </button>
      </div>
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          language={language || "text"}
          style={oneDark}
          wrapLongLines={false}
          customStyle={{
            margin: 0,
            padding: "1rem",
            fontSize: "12.5px",
            lineHeight: "1.6",
            background: "var(--color-muted)",
            whiteSpace: "pre",
          }}
          codeTagProps={{
            style: { fontFamily: "var(--font-mono, inherit)" },
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}
