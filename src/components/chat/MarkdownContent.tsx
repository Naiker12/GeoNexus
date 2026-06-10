import { useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism"
import { Check, Copy } from "lucide-react"

import { cn } from "@/lib/utils"

interface MarkdownContentProps {
  content: string
  isStreaming?: boolean
}

export function MarkdownContent({
  content,
  isStreaming,
}: MarkdownContentProps) {
  return (
    <div
      className={cn(
        "space-y-2 text-sm leading-relaxed text-foreground",
        isStreaming &&
          "after:content-['▋'] after:ml-0.5 after:animate-pulse after:text-emerald-500"
      )}
    >
      <ReactMarkdown
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
          code({ node, className, children, ...props }) {
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
        {content}
      </ReactMarkdown>
    </div>
  )
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

  return (
    <div className="my-3 rounded-lg border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-1.5 bg-muted border-b border-border">
        <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wide">
          {language || "code"}
        </span>
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
      <SyntaxHighlighter
        language={language || "text"}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: "1rem",
          fontSize: "12.5px",
          lineHeight: "1.6",
          background: "var(--color-muted)",
        }}
        codeTagProps={{
          style: { fontFamily: "var(--font-mono, inherit)" },
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}
