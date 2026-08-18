import { Cancel01Icon, RefreshIcon, ZapIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowUpIcon,
  CheckIcon,
  ChevronDownIcon,
  CodeIcon,
  CopyIcon,
  FileTextIcon,
  GlobeIcon,
  PaperclipIcon,
  PlusIcon,
  ServerIcon,
  SparklesIcon,
  StopCircleIcon,
  XIcon,
} from "lucide-react"
import * as React from "react"

import { GeoAgentsLogo } from "@/components/brand/GeoAgentsLogo"
import { AudioRecorder } from "@/components/chat/AudioRecorder"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useLanguage } from "@/i18n/useLanguage"
import { cn } from "@/lib/utils"
import type { FileAttachment, Message } from "@/types/chat"
import { MarkdownText } from "./markdown-text"
import { Reasoning } from "./reasoning"
import { type SourceItem, Sources } from "./sources"
import { ToolCall } from "./tool-fallback"

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
  const { t } = useLanguage()
  const [input, setInput] = React.useState("")
  const [codeMode, setCodeMode] = React.useState(false)
  const [supervisionMode, setSupervisionMode] = React.useState<"auto" | "approve" | "strict">(
    "approve"
  )
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

  /* Componente Reutilizable del Composer Capsule */
  const renderComposer = (isCenteredState = false) => (
    <div
      className={cn(
        "relative mx-auto w-full max-w-3xl transition-all duration-300",
        isCenteredState ? "p-0" : "p-4 pb-8"
      )}
    >
      <form
        onSubmit={handleSubmit}
        className="relative rounded-[26px] border border-border/80 bg-card/95 backdrop-blur-md shadow-lg transition-all focus-within:border-border focus-within:shadow-xl"
      >
        {/* Textarea Principal */}
        <div className="px-5 pt-4 pb-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.chat.askPlaceholder}
            rows={1}
            className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-hidden min-h-[38px] max-h-[200px] leading-relaxed font-sans"
          />
        </div>

        {/* Barra de Herramientas Inferior dentro del Composer */}
        <div className="flex items-center justify-between px-3.5 py-2.5">
          {/* Controles Izquierda: Botón + y Pills de Estado */}
          <div className="flex items-center gap-2 flex-wrap">
            <DropdownMenu open={actionMenuOpen} onOpenChange={setActionMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex size-7 items-center justify-center rounded-lg bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  aria-label="Herramientas"
                  title="Herramientas y fuentes"
                >
                  {actionMenuOpen ? (
                    <XIcon className="size-3.5" />
                  ) : (
                    <PlusIcon className="size-3.5" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                side="top"
                sideOffset={10}
                className="w-60 rounded-2xl p-1.5 shadow-xl text-xs backdrop-blur-md bg-card/95 border border-border/80 space-y-0.5"
              >
                <DropdownMenuItem
                  className="gap-2.5 rounded-xl px-2.5 py-2 cursor-pointer font-medium"
                  onClick={() => {
                    if (onAttachFiles) onAttachFiles()
                    else fileInputRef.current?.click()
                  }}
                >
                  <PaperclipIcon className="size-3.5 text-muted-foreground" />
                  <span>{t.chat.attachFiles}</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  className="gap-2.5 rounded-xl px-2.5 py-2 cursor-pointer font-medium"
                  onClick={onToggleWebSearch}
                >
                  <GlobeIcon className="size-3.5 text-emerald-500" />
                  <span className="flex-1">Búsqueda web</span>
                  {webSearchEnabled && <CheckIcon className="size-3.5 text-emerald-500" />}
                </DropdownMenuItem>

                <DropdownMenuItem
                  className="gap-2.5 rounded-xl px-2.5 py-2 cursor-pointer font-medium"
                  onClick={() => setCodeMode(!codeMode)}
                >
                  <CodeIcon className="size-3.5 text-muted-foreground" />
                  <span className="flex-1">Modo Código</span>
                  {codeMode && <CheckIcon className="size-3.5 text-emerald-500" />}
                </DropdownMenuItem>

                <DropdownMenuItem
                  className="gap-2.5 rounded-xl px-2.5 py-2 cursor-pointer font-medium"
                  onClick={() =>
                    onReasoningEffortChange(reasoningEffort === "high" ? "none" : "high")
                  }
                >
                  <SparklesIcon className="size-3.5 text-muted-foreground" />
                  <span className="flex-1">Investigación profunda</span>
                  {reasoningEffort === "high" && (
                    <CheckIcon className="size-3.5 text-emerald-500" />
                  )}
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1" />

                <DropdownMenuItem className="gap-2.5 rounded-xl px-2.5 py-2 cursor-pointer font-medium">
                  <FileTextIcon className="size-3.5 text-muted-foreground" />
                  <span>Consultar archivos locales</span>
                </DropdownMenuItem>

                <DropdownMenuItem className="gap-2.5 rounded-xl px-2.5 py-2 cursor-pointer font-medium">
                  <ServerIcon className="size-3.5 text-muted-foreground" />
                  <span>Herramientas MCP</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Pill de Supervisión (Aprobar acciones) */}
            <button
              type="button"
              onClick={() => setSupervisionMode(supervisionMode === "approve" ? "auto" : "approve")}
              className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title={t.chat.supervision}
            >
              <span>🛡️ {supervisionMode === "approve" ? t.chat.supervisionApprove : t.chat.supervisionAuto}</span>
              <ChevronDownIcon className="size-3 opacity-60" />
            </button>

            {/* Pill de Búsqueda Web */}
            <button
              type="button"
              onClick={onToggleWebSearch}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer",
                webSearchEnabled
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "text-muted-foreground hover:text-foreground bg-muted/40 border border-border/60"
              )}
            >
              <GlobeIcon className="size-3 text-emerald-500" />
              <span>{t.chat.search}</span>
            </button>

            {/* Pill de Modo Código */}
            <button
              type="button"
              onClick={() => setCodeMode(!codeMode)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer",
                codeMode
                  ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
                  : "text-muted-foreground hover:text-foreground bg-muted/40 border border-border/60"
              )}
            >
              <CodeIcon className="size-3" />
              <span>{t.chat.code}</span>
            </button>
          </div>

          {/* Controles Derecha: Razonamiento + Mic + Enviar */}
          <div className="flex items-center gap-2">
            {/* Selector de Razonamiento */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Nivel de razonamiento"
                >
                  <SparklesIcon className="size-3 text-emerald-500" />
                  <span>Razonamiento: {REASONING_LABELS[reasoningEffort]}</span>
                  <ChevronDownIcon className="size-3 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                side="top"
                sideOffset={8}
                className="w-36 rounded-xl p-1 text-xs"
              >
                {(["none", "minimal", "medium", "high", "max"] as const).map((effort) => (
                  <DropdownMenuItem
                    key={effort}
                    onClick={() => onReasoningEffortChange(effort)}
                    className={cn(
                      "rounded-lg capitalize cursor-pointer",
                      reasoningEffort === effort && "font-semibold text-primary bg-primary/10"
                    )}
                  >
                    {REASONING_LABELS[effort]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Dictado de Voz (Mic) */}
            <AudioRecorder
              onTranscription={(text) => setInput((prev) => (prev ? `${prev} ${text}` : text))}
              disabled={pending}
            />

            {/* Botón Circular de Envío / Detención */}
            {pending ? (
              <button
                type="button"
                onClick={onStop}
                className="flex size-7.5 items-center justify-center rounded-full bg-red-500 text-white shadow-xs hover:bg-red-600 transition-colors cursor-pointer"
                aria-label="Detener"
                title="Detener respuesta"
              >
                <StopCircleIcon className="size-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="flex size-7.5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs hover:bg-emerald-600 disabled:opacity-30 disabled:hover:bg-emerald-500 transition-colors cursor-pointer"
                aria-label="Enviar"
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
  )

  return (
    <div className="relative flex flex-col h-full w-full overflow-hidden bg-background">
      {isEmpty ? (
        /* Estado Vacío: Hero + Composer completamente CENTRADOS en el medio */
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 max-w-3xl mx-auto w-full space-y-6 select-none animate-in fade-in duration-300">
          <div className="flex items-center justify-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 border border-primary/25 text-primary shadow-xs">
              <GeoAgentsLogo variant="icon" className="size-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground font-sans">
              {t.chat.greeting}
            </h1>
          </div>

          <div className="w-full">{renderComposer(true)}</div>
        </div>
      ) : (
        /* Estado con Mensajes: Lista arriba con scroll + Composer anclado abajo */
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 [scrollbar-width:thin]">
            <div className="mx-auto max-w-3xl space-y-6">
              {messages.map((message, idx) => (
                <div
                  key={message.id || idx}
                  className={cn(
                    "flex gap-3.5 group transition-all",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role !== "user" && (
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-card border border-border/80 shadow-2xs mt-0.5">
                      <GeoAgentsLogo variant="icon" className="size-4.5 text-primary" />
                    </div>
                  )}

                  <div
                    className={cn(
                      "flex flex-col max-w-[88%] sm:max-w-[80%] text-[13.5px] transition-all",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground font-medium rounded-2xl rounded-tr-xs px-4.5 py-3 shadow-xs leading-relaxed break-words"
                        : "bg-card border border-border/70 text-card-foreground rounded-2xl rounded-tl-xs p-4.5 shadow-2xs backdrop-blur-xs leading-relaxed"
                    )}
                  >
                    {message.role !== "user" && (
                      <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-border/40 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground/90">GeoNexus AI</span>
                          {message.model && (
                            <span className="rounded-md bg-muted/60 border border-border/50 px-1.5 py-0.2 text-[10px] font-mono text-muted-foreground">
                              {message.model}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(message.content)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground transition-all rounded-md cursor-pointer"
                          title="Copiar respuesta"
                        >
                          <CopyIcon className="size-3.5" />
                        </button>
                      </div>
                    )}

                    {(message.reasoning_content || message.reasoning) && (
                      <Reasoning
                        content={message.reasoning_content || message.reasoning || ""}
                        isStreaming={isStreaming && idx === messages.length - 1}
                      />
                    )}

                    <MarkdownText
                      content={message.content}
                      isStreaming={isStreaming && idx === messages.length - 1}
                    />

                    {((message.tool_calls || message.toolCalls) as any[])?.map(
                      (tool: any, tIdx: number) => (
                        <ToolCall
                          key={tIdx}
                          toolName={tool.name || tool.tool_name || "Tool"}
                          args={tool.args || tool.arguments}
                          result={tool.result || tool.output}
                          status={tool.status}
                        />
                      )
                    )}

                    {message.sources && message.sources.length > 0 && (
                      <Sources
                        sources={message.sources.map((s, sIdx) =>
                          typeof s === "string"
                            ? { id: String(sIdx), title: s, sourceType: "web" }
                            : (s as SourceItem)
                        )}
                      />
                    )}
                  </div>
                </div>
              ))}

              {error && (
                <div className="mx-auto max-w-xl rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-xs text-destructive shadow-2xs backdrop-blur-md animate-in fade-in duration-200">
                  <div className="flex items-start gap-3">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-destructive/15 text-destructive mt-0.5">
                      <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-4" />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground text-xs font-sans">
                          No se pudo completar la respuesta
                        </span>
                        <span className="text-[10px] font-mono text-destructive/80 uppercase tracking-wider font-semibold">
                          Error de Inferencia
                        </span>
                      </div>
                      <p className="text-muted-foreground text-[11.5px] leading-relaxed">{error}</p>
                      <div className="flex items-center gap-2 pt-2">
                        {onRegenerate && (
                          <button
                            type="button"
                            onClick={onRegenerate}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-2xs hover:bg-primary/90 transition-colors cursor-pointer"
                          >
                            <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} className="size-3" />
                            <span>Reintentar</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => window.dispatchEvent(new CustomEvent("geonexus:open-settings"))}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
                        >
                          <HugeiconsIcon
                            icon={ZapIcon}
                            strokeWidth={1.75}
                            className="size-3 text-amber-500"
                          />
                          <span>Configurar Proveedores de IA</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Composer anclado abajo */}
          {renderComposer(false)}
        </>
      )}
    </div>
  )
}
