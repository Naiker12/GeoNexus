import * as React from "react"
import {
  ArrowUpIcon,
  BotIcon,
  BrainIcon,
  CheckIcon,
  ChevronDownIcon,
  CodeIcon,
  CopyIcon,
  FileTextIcon,
  GlobeIcon,
  MicIcon,
  PaperclipIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  ServerIcon,
  SparklesIcon,
  StopCircleIcon,
  UserIcon,
  XIcon,
} from "lucide-react"

import { GeoAgentsLogo } from "@/components/brand/GeoAgentsLogo"
import { MarkdownText } from "./markdown-text"
import { Reasoning } from "./reasoning"
import { Sources, type SourceItem } from "./sources"
import { ToolCall } from "./tool-fallback"
import { AudioRecorder } from "@/components/chat/AudioRecorder"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { Message, FileAttachment } from "@/types/chat"

export interface ThreadProps {
  messages: Message[]
  pending: boolean
  isStreaming?: boolean
  error?: string | null
  webSearchEnabled: boolean
  onToggleWebSearch: () => void
  reasoningEffort: "none" | "minimal" | "medium" | "high" | "max"
  onReasoningEffortChange: (v: "none" | "minimal" | "medium" | "high" | "max") => void
  onSubmit: (content: string, mentions?: any, attachments?: FileAttachment[]) => void
  onStop?: () => void
  onRegenerate?: () => void
  onAttachFiles?: () => void
}

const REASONING_LABELS = {
  none: "Desactivado",
  minimal: "Mínimo",
  medium: "Medio",
  high: "Alto",
  max: "Máximo",
}

export function Thread({
  messages,
  pending,
  isStreaming,
  error,
  webSearchEnabled,
  onToggleWebSearch,
  reasoningEffort,
  onReasoningEffortChange,
  onSubmit,
  onStop,
  onRegenerate,
  onAttachFiles,
}: ThreadProps) {
  const [input, setInput] = React.useState("")
  const [codeMode, setCodeMode] = React.useState(false)
  const [supervisionMode, setSupervisionMode] = React.useState<"auto" | "approve" | "strict">("approve")
  const [actionMenuOpen, setActionMenuOpen] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, pending])

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!input.trim() || pending) return
    onSubmit(input.trim())
    setInput("")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div className="relative flex flex-col h-full w-full overflow-hidden bg-background">
      {/* ─── Área de Mensajes con Scroll Suave ─── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 [scrollbar-width:thin]">
        <div className="mx-auto max-w-3xl space-y-6">
          {isEmpty ? (
            /* Estado Hero Vacío */
            <div className="flex flex-col items-center justify-center min-h-[52vh] text-center space-y-4 pt-10">
              <div className="relative flex size-18 items-center justify-center rounded-3xl bg-primary/10 border border-primary/20 shadow-sm">
                <GeoAgentsLogo variant="icon" className="size-11" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground font-sans">
                ¿Qué tienes en mente hoy?
              </h1>
              <p className="text-sm text-muted-foreground max-w-lg leading-relaxed">
                GeoNexus está listo para analizar capas geoespaciales, procesar archivos, ejecutar código, investigar y razonar de forma privada.
              </p>
            </div>
          ) : (
            messages.map((message, idx) => (
              <div
                key={message.id || idx}
                className={cn(
                  "flex gap-3.5 group transition-all",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role !== "user" && (
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary mt-0.5 shadow-2xs border border-primary/20">
                    <BotIcon className="size-4" />
                  </div>
                )}

                <div
                  className={cn(
                    "relative rounded-2xl px-4 py-3 text-sm max-w-[85%]",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-xs shadow-xs"
                      : "bg-card/90 text-card-foreground border border-border/70 rounded-tl-xs shadow-xs"
                  )}
                >
                  {message.role === "user" ? (
                    <div className="whitespace-pre-wrap leading-relaxed font-sans">{message.content}</div>
                  ) : (
                    <div className="space-y-3">
                      {/* Cadena de Razonamiento */}
                      {message.reasoning && (
                        <Reasoning
                          content={message.reasoning}
                          isStreaming={isStreaming && idx === messages.length - 1}
                        />
                      )}

                      {/* Render de Markdown con Streamdown */}
                      <MarkdownText
                        content={message.content}
                        isStreaming={isStreaming && idx === messages.length - 1}
                      />

                      {/* Llamadas a Herramientas */}
                      {message.toolCalls?.map((tool, tIdx) => (
                        <ToolCall
                          key={tIdx}
                          toolName={tool.name}
                          args={tool.args}
                          result={tool.result}
                          status={tool.status}
                        />
                      ))}

                      {/* Fuentes y Citas RAG */}
                      {message.sources && message.sources.length > 0 && (
                        <Sources sources={message.sources as SourceItem[]} />
                      )}
                    </div>
                  )}
                </div>

                {message.role === "user" && (
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground mt-0.5">
                    <UserIcon className="size-4" />
                  </div>
                )}
              </div>
            ))
          )}

          {error && (
            <div className="mx-auto max-w-md rounded-2xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive text-center">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* ─── Composer Flotante (Plantilla ChatGPT / Assistant-UI) ─── */}
      <div className="relative mx-auto w-full max-w-3xl shrink-0 p-4 pb-6">
        <form
          onSubmit={handleSubmit}
          className="relative rounded-3xl border border-border/80 bg-card/95 backdrop-blur-md shadow-lg transition-all focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20"
        >
          {/* Textarea Principal */}
          <div className="px-4 pt-3.5 pb-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pregunta lo que sea o escribe una tarea..."
              rows={1}
              className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-hidden min-h-[38px] max-h-[200px]"
            />
          </div>

          {/* Barra de Herramientas Inferior dentro del Composer */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-border/40">
            {/* Controles Izquierda: Botón + y Pills de Estado */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <DropdownMenu open={actionMenuOpen} onOpenChange={setActionMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex size-7.5 items-center justify-center rounded-full bg-muted/80 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    aria-label="Abrir menú de herramientas"
                    title="Herramientas y fuentes"
                  >
                    {actionMenuOpen ? <XIcon className="size-4" /> : <PlusIcon className="size-4" />}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="top" sideOffset={12} className="w-60 rounded-2xl p-1.5 shadow-xl text-xs">
                  <DropdownMenuItem
                    className="gap-2.5 rounded-xl px-2.5 py-2 cursor-pointer"
                    onClick={() => {
                      if (onAttachFiles) onAttachFiles()
                      else fileInputRef.current?.click()
                    }}
                  >
                    <PaperclipIcon className="size-3.5 text-muted-foreground" />
                    <span>Adjuntar fotos y archivos</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    className="gap-2.5 rounded-xl px-2.5 py-2 cursor-pointer"
                    onClick={onToggleWebSearch}
                  >
                    <GlobeIcon className="size-3.5 text-muted-foreground" />
                    <span className="flex-1">Búsqueda web</span>
                    {webSearchEnabled && <CheckIcon className="size-3.5 text-emerald-500" />}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    className="gap-2.5 rounded-xl px-2.5 py-2 cursor-pointer"
                    onClick={() => setCodeMode(!codeMode)}
                  >
                    <CodeIcon className="size-3.5 text-muted-foreground" />
                    <span className="flex-1">Modo Código</span>
                    {codeMode && <CheckIcon className="size-3.5 text-emerald-500" />}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    className="gap-2.5 rounded-xl px-2.5 py-2 cursor-pointer"
                    onClick={() => onReasoningEffortChange(reasoningEffort === "high" ? "none" : "high")}
                  >
                    <SparklesIcon className="size-3.5 text-muted-foreground" />
                    <span className="flex-1">Investigación profunda</span>
                    {reasoningEffort === "high" && <CheckIcon className="size-3.5 text-emerald-500" />}
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem className="gap-2.5 rounded-xl px-2.5 py-2 cursor-pointer">
                    <FileTextIcon className="size-3.5 text-muted-foreground" />
                    <span>Consultar archivos locales</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem className="gap-2.5 rounded-xl px-2.5 py-2 cursor-pointer">
                    <ServerIcon className="size-3.5 text-muted-foreground" />
                    <span>Herramientas MCP</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Pill de Supervisión */}
              <button
                type="button"
                onClick={() => setSupervisionMode(supervisionMode === "approve" ? "auto" : "approve")}
                className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Modo de supervisión de acciones del agente"
              >
                <span>🛡️ Supervisión: {supervisionMode === "approve" ? "Aprobar" : "Automática"}</span>
                <ChevronDownIcon className="size-3 opacity-60" />
              </button>

              {/* Pill de Búsqueda Web Activa */}
              {webSearchEnabled && (
                <button
                  type="button"
                  onClick={onToggleWebSearch}
                  className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15 transition-colors"
                >
                  <GlobeIcon className="size-3" />
                  <span>Búsqueda</span>
                </button>
              )}

              {/* Pill de Modo Código Activo */}
              {codeMode && (
                <button
                  type="button"
                  onClick={() => setCodeMode(false)}
                  className="flex items-center gap-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/15 transition-colors"
                >
                  <CodeIcon className="size-3" />
                  <span>Código</span>
                </button>
              )}
            </div>

            {/* Controles Derecha: Razonamiento + Micrófono + Enviar */}
            <div className="flex items-center gap-2">
              {/* Selector de Razonamiento */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                    title="Nivel de razonamiento del modelo"
                  >
                    <BrainIcon className="size-3 text-amber-500" />
                    <span>Razonamiento: {REASONING_LABELS[reasoningEffort]}</span>
                    <ChevronDownIcon className="size-3 opacity-60" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="top" className="w-40 rounded-xl p-1 text-xs">
                  {(["none", "minimal", "medium", "high", "max"] as const).map((effort) => (
                    <DropdownMenuItem
                      key={effort}
                      onClick={() => onReasoningEffortChange(effort)}
                      className={cn("rounded-lg", reasoningEffort === effort && "font-semibold text-primary bg-primary/10")}
                    >
                      {REASONING_LABELS[effort]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Grabación / Dictado de Voz */}
              <AudioRecorder
                onTranscription={(text) => setInput((prev) => (prev ? `${prev} ${text}` : text))}
                disabled={pending}
              />

              {/* Botón Circular de Envío / Detención */}
              {pending ? (
                <button
                  type="button"
                  onClick={onStop}
                  className="flex size-8 items-center justify-center rounded-full bg-red-500 text-white shadow-xs hover:bg-red-600 transition-colors"
                  aria-label="Detener respuesta"
                  title="Detener respuesta"
                >
                  <StopCircleIcon className="size-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="flex size-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs hover:bg-emerald-600 disabled:opacity-30 disabled:hover:bg-emerald-500 transition-colors"
                  aria-label="Enviar mensaje"
                  title="Enviar mensaje"
                >
                  <ArrowUpIcon className="size-4 stroke-[2.5]" />
                </button>
              )}
            </div>
          </div>

          <input ref={fileInputRef} type="file" multiple className="hidden" />
        </form>
      </div>
    </div>
  )
}
