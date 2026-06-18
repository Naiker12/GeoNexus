import { useState } from "react"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { cn } from "@/lib/utils"

const geonexusTheme: Record<string, React.CSSProperties> = {
  'code[class*="language-"]': {
    color: "#383028",
    background: "transparent",
    fontFamily: "var(--font-mono, ui-monospace, monospace)",
    fontSize: "13px",
    lineHeight: "1.6",
    whiteSpace: "pre",
    wordSpacing: "normal",
    wordBreak: "normal",
    tabSize: 2,
  },
  'pre[class*="language-"]': {
    background: "transparent",
    margin: 0,
    padding: 0,
    overflow: "auto",
  },
  keyword:   { color: "#9333EA" },
  builtin:   { color: "#9333EA" },
  "class-name": { color: "#D97706" },
  function:  { color: "#0369A1" },
  string:    { color: "#16A34A" },
  number:    { color: "#DC2626" },
  boolean:   { color: "#9333EA" },
  operator:  { color: "#383028" },
  punctuation: { color: "#7C6F64" },
  comment:   { color: "#A8A29E", fontStyle: "italic" },
  variable:  { color: "#383028" },
  parameter: { color: "#383028" },
  property:  { color: "#0369A1" },
  "attr-name": { color: "#D97706" },
  "attr-value": { color: "#16A34A" },
  tag:       { color: "#DC2626" },
  selector:  { color: "#9333EA" },
}

function normalizeLanguage(lang: string | undefined): string {
  if (!lang) return "text"
  const map: Record<string, string> = {
    js: "javascript", ts: "typescript", jsx: "jsx", tsx: "tsx",
    py: "python", rb: "ruby", sh: "bash", shell: "bash",
    yml: "yaml", md: "markdown", rs: "rust", kt: "kotlin",
  }
  const normalized = lang.toLowerCase().split(/[^a-z]/)[0]
  return map[normalized] ?? normalized
}

function languageLabel(lang: string): string {
  const labels: Record<string, string> = {
    javascript: "JavaScript", typescript: "TypeScript",
    jsx: "JSX", tsx: "TSX", python: "Python",
    rust: "Rust", java: "Java", kotlin: "Kotlin",
    bash: "Bash", sql: "SQL", json: "JSON",
    yaml: "YAML", markdown: "Markdown", html: "HTML",
    css: "CSS", text: "text", toml: "TOML",
  }
  return labels[lang] ?? lang.toUpperCase()
}

interface CodeBlockProps {
  children: string
  className?: string
  inline?: boolean
}

export function CodeBlock({ children, className, inline }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  if (inline) {
    return (
      <code className="font-mono text-[13px] bg-stone-100 text-stone-700 px-1.5 py-0.5 rounded-md border border-stone-200">
        {children}
      </code>
    )
  }

  const rawLang = className?.replace("language-", "") ?? ""
  const lang = normalizeLanguage(rawLang || "text")
  const label = languageLabel(lang)
  const codeText = String(children).replace(/\n$/, "")

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codeText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="my-3 rounded-lg border border-stone-200 overflow-hidden bg-[#F5F0E8]">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-200/60">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
          </div>
          <span className="text-[12px] text-stone-500 font-mono">{label}</span>
        </div>
        <button
          onClick={handleCopy}
          className={cn(
            "flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-md transition-colors",
            copied
              ? "text-emerald-600 bg-emerald-50"
              : "text-stone-400 hover:text-stone-600 hover:bg-stone-200/50"
          )}
        >
          {copied ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Copiado
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              Copiar
            </>
          )}
        </button>
      </div>

      <div className="overflow-x-auto">
        <SyntaxHighlighter
          language={lang}
          style={geonexusTheme}
          customStyle={{
            margin: 0,
            padding: "16px",
            background: "transparent",
            fontSize: "13px",
            lineHeight: "1.65",
          }}
          codeTagProps={{
            style: {
              fontFamily: 'var(--font-mono, ui-monospace, "Cascadia Code", "Fira Code", monospace)',
            },
          }}
          wrapLongLines={false}
        >
          {codeText}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}
