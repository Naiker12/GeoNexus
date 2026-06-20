import { useRef, useEffect, useState } from "react"
import {
  RefreshCwIcon, TerminalIcon, Trash2Icon, CopyIcon, SearchIcon, XIcon,
} from "lucide-react"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import { useMcpTerminal, type TerminalLine } from "./hooks/useMcpTerminal"

export function McpConsole() {
  const { lines, history, historyIdx, setHistoryIdx, execute, clear } = useMcpTerminal()
  const [input, setInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [lines])

  const handleSubmit = async () => {
    if (!input.trim()) return
    setInput("")
    await execute(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { handleSubmit(); return }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      if (history.length > 0 && historyIdx < history.length - 1) {
        const next = historyIdx + 1
        setHistoryIdx(next)
        setInput(history[next])
      }
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      if (historyIdx > 0) {
        const next = historyIdx - 1
        setHistoryIdx(next)
        setInput(history[next])
      } else if (historyIdx === 0) {
        setHistoryIdx(-1)
        setInput("")
      }
    }
  }

  const filteredLines = searchQuery
    ? lines.filter(l => l.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : lines

  const handleCopy = () => {
    const text = lines.map(l => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.text}`).join("\n")
    navigator.clipboard.writeText(text)
  }

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-[#0d0e11] shadow-xl">
      <div className="flex items-center justify-between border-b border-border/80 bg-[#16181d] px-2 py-1 text-xs text-slate-400 select-none">
        <span className="flex items-center gap-2 font-medium px-2 py-1">
          <TerminalIcon className="size-3.5" />
          MCP Terminal
        </span>
        <div className="flex items-center gap-1">
          {searchQuery ? (
            <div className="flex items-center gap-1 bg-[#1e222b] px-1.5 py-0.5 rounded border border-border/60">
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Filtrar..."
                className="bg-transparent border-none outline-none text-[10px] text-[#cccccc] w-20 p-0 focus:ring-0"
                autoFocus
              />
              <button onClick={() => { setSearchQuery("") }} className="hover:text-white">
                <XIcon className="size-3" />
              </button>
            </div>
          ) : (
            <button onClick={() => setSearchQuery(" ")} title="Buscar" className="p-1 hover:bg-[#282c34] rounded">
              <SearchIcon className="size-3.5" />
            </button>
          )}
          <button onClick={handleCopy} title="Copiar" className="p-1 hover:bg-[#282c34] rounded">
            <CopyIcon className="size-3.5" />
          </button>
          <button onClick={clear} title="Limpiar" className="p-1 hover:bg-[#282c34] rounded">
            <Trash2Icon className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="h-64 overflow-y-auto bg-[#090a0c] p-3 font-mono text-[11px] leading-relaxed select-text">
        {filteredLines.map(line => <TerminalLineRow key={line.id} line={line} />)}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-1.5 border-t border-border/80 bg-[#16181d] px-3 py-1.5">
        <span className="shrink-0 text-emerald-400 select-none text-xs">$</span>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-none outline-none text-xs text-[#cccccc] placeholder:text-slate-600 focus:ring-0 p-0"
          placeholder='Escribe "help" para los comandos disponibles...'
          spellCheck={false}
          autoComplete="off"
        />
      </div>
    </section>
  )
}

function TerminalLineRow({ line }: { line: TerminalLine }) {
  const colorMap: Record<TerminalLine["type"], string> = {
    input:   "text-zinc-300",
    output:  "text-zinc-400",
    info:    "text-sky-400",
    success: "text-emerald-400",
    error:   "text-red-400",
  }
  return (
    <div className={cn("whitespace-pre-wrap font-mono", colorMap[line.type])}>
      {line.type !== "input" && line.type !== "output" && (
        <span className="text-zinc-600 mr-2 select-none">{line.timestamp}</span>
      )}
      {line.text}
    </div>
  )
}
