import { useEffect, useState, useCallback, useRef } from "react"
import { XIcon, Loader2Icon, CopyIcon, CheckIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface SkillDetailDrawerProps {
  skillId: string | null
  onClose: () => void
  onReadSkillMd: (id: string) => Promise<string>
  onUseInChat: (skillId: string) => void
}

export function SkillDetailDrawer({ skillId, onClose, onReadSkillMd, onUseInChat }: SkillDetailDrawerProps) {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    if (!skillId) { setContent(null); return }
    setLoading(true)
    try {
      const md = await onReadSkillMd(skillId)
      setContent(md)
    } catch {
      setContent("Error al leer SKILL.md")
    } finally {
      setLoading(false)
    }
  }, [skillId, onReadSkillMd])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [skillId])

  const handleCopy = async () => {
    if (!content) return
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* ignore */ }
  }

  if (!skillId) return null

  const lines = content ? content.split("\n") : []

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-[min(94vw,40rem)] border-l border-border bg-card shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5 shrink-0 bg-muted/40">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-muted-foreground text-xs">SKILL.md</span>
          <span className="text-muted-foreground text-[10px]">—</span>
          <h3 className="text-sm font-medium text-foreground truncate">{skillId}</h3>
          {content && (
            <span className="text-[10px] text-muted-foreground">{lines.length} lines</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
            title="Copiar contenido"
          >
            {copied ? <CheckIcon className="size-3.5 text-emerald-500" /> : <CopyIcon className="size-3.5" />}
          </button>
          <button
            onClick={() => onUseInChat(skillId)}
            className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Usar en chat
          </button>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/80">
            <XIcon className="size-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-auto [scrollbar-width:thin]">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex">
            {/* Line numbers */}
            <div className="sticky top-0 select-none text-right pr-4 pl-3 py-4 text-[12px] leading-[22px] text-muted-foreground/40 font-mono bg-card shrink-0">
              {lines.map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            {/* Code */}
            <pre className="flex-1 py-4 pr-4 overflow-x-auto text-[13px] leading-[22px] font-mono text-foreground whitespace-pre-wrap break-all [scrollbar-width:thin] m-0 bg-transparent">
              <code>
                {lines.map((line, i) => (
                  <div key={i} className="min-h-[22px]">{syntaxSegment(line)}</div>
                ))}
              </code>
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

function syntaxSegment(line: string): React.ReactNode {
  if (line === "---") {
    return <span className="text-purple-500 dark:text-purple-400 font-bold">---</span>
  }

  const frontmatterKeyMatch = line.match(/^(\w[\w-]*)(:\s*)(.*)$/)
  if (frontmatterKeyMatch) {
    const [, key, colon, value] = frontmatterKeyMatch
    return (
      <>
        <span className="text-sky-600 dark:text-sky-400">{key}</span>
        <span className="text-muted-foreground">{colon}</span>
        <span className="text-blue-600 dark:text-blue-300">{value}</span>
      </>
    )
  }

  if (line.match(/^[\s]*[-*+]\s/)) {
    return <span className="text-purple-600 dark:text-purple-400">{line}</span>
  }

  if (line.startsWith("##")) {
    return <span className="text-orange-500 dark:text-orange-400 font-semibold">{line}</span>
  }
  if (line.startsWith("#")) {
    return <span className="text-red-500 dark:text-red-400 font-bold">{line}</span>
  }

  if (line.includes("`")) {
    return <InlineCodeHighlight line={line} />
  }

  if (line.includes("http")) {
    return <LinkHighlight line={line} />
  }

  return <span>{line}</span>
}

function InlineCodeHighlight({ line }: { line: string }) {
  const parts = line.split(/(`[^`]+`)/g)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("`") && part.endsWith("`") ? (
          <code key={i} className="bg-muted/70 text-orange-600 dark:text-orange-400 px-1 rounded text-[12px]">
            {part.slice(1, -1)}
          </code>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

function LinkHighlight({ line }: { line: string }) {
  const parts = line.split(/(https?:\/\/[^\s]+)/g)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("http") ? (
          <span key={i} className="text-blue-600 dark:text-blue-400 underline">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}
