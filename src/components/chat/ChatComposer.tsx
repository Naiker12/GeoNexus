import * as React from "react"
import {
  CloudIcon,
  CpuIcon,
  DatabaseIcon,
  DownloadIcon,
  FileTextIcon,
  GitForkIcon,
  GlobeIcon,
  Loader2,
  PaperclipIcon,
  PlusIcon,
  PuzzleIcon,
  RefreshCwIcon,
  SearchIcon,
  SendIcon,
  ServerIcon,
  SparklesIcon,
  StopCircleIcon,
  Trash2Icon,
  XIcon,
  ZapIcon,
} from "lucide-react"

import { Button } from "@/components/ui/Button"
import { CompactPicker, type CompactPickerItem } from "@/components/chat/CompactPicker"
import { usePickerTrigger } from "@/hooks/usePickerTrigger"
import { SkillActivationBadge } from "@/features/workspace/skills/SkillActivationBadge"
import { ConversationMemoryBadge } from "@/components/chat/ConversationMemoryBadge"
import { DropZone } from "@/components/chat/DropZone"
import { AudioRecorder } from "@/components/chat/AudioRecorder"
import type { SkillInfo, SessionSummary, FileAttachment } from "@/types/chat"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupControl,
} from "@/components/ui/input-group"
import { Textarea } from "@/components/ui/Textarea"
import { getMentionableSources } from "@/api/chat"
import { listSkills } from "@/api/skills"
import type { MentionSource, MentionableSourcesResponse, MentionKind } from "@/types/chat"
import type { AgentSourceType } from "@/types/agents"
import { parseMentions } from "@/features/workspace/chat/MentionPicker"
import { ToolMenu } from "@/components/chat/ToolMenu"
import { useAgentTaskStore } from "@/features/agent/store/useAgentTaskStore"
import { AttachmentChips, type Chip } from "@/components/chat/AttachmentChips"
import { ReasoningToggle, type ReasoningEffort } from "@/features/chat/ReasoningToggle"

export type ChatComposerProps = {
  value: string
  onValueChange: (value: string) => void
  activeProvider: { provider: string; model: string; endpoint: string } | null
  error: string | null
  pending: boolean
  onSubmit: (content: string, mentions?: { assetIds: string[]; connectorIds: string[]; mcpServerIds: string[]; nodeIds: string[]; agentSources?: AgentSourceType[]; skillNames?: string[] }, attachments?: FileAttachment[]) => void
  onStop?: () => void
  onToggleContext: () => void
  contextActive: boolean
  webSearchEnabled: boolean
  onToggleWebSearch: () => void
  onMentionSelect?: (source: MentionSource) => void
  onNewChat?: () => void
  onClearChat?: () => void
  onExportChat?: () => void
  onReindex?: () => void
  activeSkills?: SkillInfo[]
  onRemoveSkill?: (id: string) => void
  sessionSummary?: SessionSummary | null
  reasoningEffort?: ReasoningEffort
  onReasoningEffortChange?: (v: ReasoningEffort) => void
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function ChatComposer({
  value,
  onValueChange,
  activeProvider,
  error,
  pending,
  onSubmit,
  onStop,
  onToggleContext,
  contextActive,
  webSearchEnabled,
  onToggleWebSearch,
  onMentionSelect,
  onNewChat,
  onClearChat,
  onExportChat,
  onReindex,
  activeSkills,
  onRemoveSkill,
  sessionSummary,
  reasoningEffort,
  onReasoningEffortChange,
}: ChatComposerProps) {
  // Picker state (unified @ and /)
  const createTask = useAgentTaskStore((s) => s.createTask)
  const agentMode = useAgentTaskStore((s) => s.mode)
  const setAgentMode = useAgentTaskStore((s) => s.setMode)
  const [chips, setChips] = React.useState<Chip[]>([])
  const [cursorPos, setCursorPos] = React.useState(0)
  const [selectedPickerIndex, setSelectedPickerIndex] = React.useState(0)
  const [anchorPosition, setAnchorPosition] = React.useState({ x: 0, y: 0 })
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const { trigger, query, close: closePicker } = usePickerTrigger(value, cursorPos)

  // Mention sources — fetched from real DB via get_mentionable_sources
  const [rawSources, setRawSources] = React.useState<MentionableSourcesResponse | null>(null)
  const [skillSources, setSkillSources] = React.useState<MentionSource[]>([])

  const refreshSources = React.useCallback(() => {
    getMentionableSources("project-default")
      .then(setRawSources)
      .catch(() => setRawSources(null))
  }, [])

  React.useEffect(() => {
    listSkills().then(skills => {
      setSkillSources(skills.map(s => ({
        id: s.name,
        kind: "skill" as MentionKind,
        label: s.name,
        sublabel: s.description ?? "Skill",
        icon: "Cpu",
        color: "#8B5CF6",
        contextPayload: { type: "skill" as MentionKind, id: s.name },
      })))
    }).catch(() => {})
  }, [])

  React.useEffect(() => {
    refreshSources()
  }, [refreshSources])

  const mentionSources: MentionSource[] = React.useMemo(() => {
    const result: MentionSource[] = []

    if (rawSources) {
      for (const c of rawSources.connectors) {
        result.push({
          id: c.id,
          kind: "connector",
          label: c.label,
          sublabel: c.sublabel,
          icon: c.icon,
          color: c.color,
          status: c.status,
          contextPayload: { type: "connector", id: c.id },
        })
      }
      for (const m of rawSources.mcp_servers ?? []) {
        result.push({
          id: m.id,
          kind: "mcp_server",
          label: m.label,
          sublabel: m.sublabel,
          icon: m.icon,
          color: m.color,
          status: m.status,
          contextPayload: { type: "mcp_server", id: m.id },
        })
      }
      for (const a of rawSources.assets) {
        result.push({
          id: a.id,
          kind: "asset",
          label: a.label,
          sublabel: a.sublabel,
          icon: a.icon,
          color: a.color,
          contextPayload: { type: "asset", id: a.id },
        })
      }
      for (const n of rawSources.graph_nodes) {
        result.push({
          id: n.id,
          kind: "graph_node",
          label: n.label,
          sublabel: n.sublabel,
          icon: n.icon,
          color: n.color,
          contextPayload: { type: "graph_node", id: n.id },
        })
      }
    }

    for (const s of skillSources) {
      result.push(s)
    }

    return result
  }, [rawSources, skillSources])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const clean = value.trim()
    if (!clean || pending) return

    const assetIds: string[] = []
    const connectorIds: string[] = []
    const mcpServerIds: string[] = []
    const nodeIds: string[] = []
    const agentSources: AgentSourceType[] = []
    const skillNamesFromChips: string[] = []
    const attachments: FileAttachment[] = []

    let finalContent = clean
    for (const chip of chips) {
      finalContent = finalContent.replace(
        `@${chip.label}`,
        `@[${chip.label}](${chip.kind}:${chip.id})`
      )
      if (chip.kind === "asset") {
        assetIds.push(chip.id)
        if (chip.file) {
          attachments.push({
            id: chip.id,
            name: chip.file.name,
            type: chip.file.type,
            size: chip.file.size,
            data: chip.base64Data,
            previewUrl: chip.previewUrl,
          })
        }
      }
      else if (chip.kind === "connector") connectorIds.push(chip.id)
      else if (chip.kind === "mcp_server") mcpServerIds.push(chip.id)
      else if (chip.kind === "graph_node") nodeIds.push(chip.id)
      else if (chip.kind === "agent_source") agentSources.push(chip.id as AgentSourceType)
      else if (chip.kind === "skill") skillNamesFromChips.push(chip.id)
    }

    // Merge text-parsed mentions with chip-based mentions
    const { mentions: textMentions } = parseMentions(finalContent)
    const allAgentSources = [...new Set([...agentSources, ...textMentions])]

    onValueChange("")
    setChips([])
    closePicker()

    const allSkillNames = skillNamesFromChips.length > 0 ? skillNamesFromChips : undefined
    onSubmit(finalContent, { assetIds, connectorIds, mcpServerIds, nodeIds, agentSources: allAgentSources.length > 0 ? allAgentSources : undefined, skillNames: allSkillNames }, attachments.length > 0 ? attachments : undefined)
  }

  function estimateCursorPosition(textarea: HTMLTextAreaElement): { x: number; y: number } {
    const pos = textarea.selectionStart
    const text = textarea.value.slice(0, pos)
    const s = window.getComputedStyle(textarea)
    const mirror = document.createElement("div")
    mirror.style.cssText = [
      "position:fixed;top:-9999px;left:-9999px",
      "white-space:pre-wrap;word-wrap:break-word",
      `font-size:${s.fontSize};font-family:${s.fontFamily};line-height:${s.lineHeight}`,
      `padding:${s.paddingTop} ${s.paddingRight} ${s.paddingBottom} ${s.paddingLeft}`,
      `border:${s.borderTopWidth} ${s.borderRightStyle} ${s.borderBottomWidth} ${s.borderLeftWidth}`,
      `width:${textarea.clientWidth}px`,
    ].join(";")
    mirror.textContent = text
    const span = document.createElement("span")
    span.textContent = "."
    mirror.appendChild(span)
    document.body.appendChild(mirror)
    const mirrorRect = mirror.getBoundingClientRect()
    const spanRect = span.getBoundingClientRect()
    document.body.removeChild(mirror)
    const taRect = textarea.getBoundingClientRect()
    return {
      x: taRect.left + (spanRect.left - mirrorRect.left),
      y: taRect.top + (spanRect.top - mirrorRect.top),
    }
  }

  const handleComposerChange = (newValue: string, event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCursorPos(event.target.selectionStart)
    onValueChange(newValue)
  }

  // Extract agent source mentions from text (also handle via chips)
  const agentMentionsFromText = React.useMemo(() => {
    const { mentions } = parseMentions(value)
    return mentions
  }, [value])

  const removeChip = (id: string) => {
    setChips((prev) => prev.filter((c) => c.id !== id))
  }

  // ── Unified picker items ──

  const mentionIcons: Record<MentionKind, React.ReactNode> = {
    connector: <CloudIcon className="size-3.5" />,
    asset: <FileTextIcon className="size-3.5" />,
    graph_node: <GitForkIcon className="size-3.5" />,
    agent_source: <CpuIcon className="size-3.5" />,
    skill: <PuzzleIcon className="size-3.5" />,
    mcp_server: <ServerIcon className="size-3.5" />,
  }

  const mentionGroupLabels: Record<MentionKind, string> = {
    connector: "Conectores",
    asset: "Assets",
    graph_node: "Grafo",
    agent_source: "Agentes",
    skill: "Skills",
    mcp_server: "Servidores MCP",
  }

  const mentionKindOrder: MentionKind[] = ["connector", "mcp_server", "asset", "graph_node", "skill"]

  const slashCommands: { id: string; group: string; label: string; subtitle: string; icon: React.ReactNode; run: () => void }[] = [
    { id: "attach-file", group: "Contexto", label: "Adjuntar archivo", subtitle: "Sube un documento", icon: <PaperclipIcon className="size-3.5" />, run: () => fileInputRef.current?.click() },
    { id: "attach-asset", group: "Contexto", label: "Adjuntar asset", subtitle: "Asset del catálogo", icon: <DatabaseIcon className="size-3.5" />, run: () => fileInputRef.current?.click() },
    { id: "use-graph", group: "Contexto", label: "Usar grafo", subtitle: "Incluye nodos del grafo", icon: <GitForkIcon className="size-3.5" />, run: () => onToggleContext() },
    { id: "new-chat", group: "Chat", label: "Nuevo chat", subtitle: "Empieza una conversación", icon: <PlusIcon className="size-3.5" />, run: () => onNewChat?.() },
    { id: "clear-chat", group: "Chat", label: "Limpiar chat", subtitle: "Borra los mensajes", icon: <Trash2Icon className="size-3.5" />, run: () => onClearChat?.() },
    { id: "export-chat", group: "Chat", label: "Exportar chat", subtitle: "Descarga como Markdown", icon: <DownloadIcon className="size-3.5" />, run: () => onExportChat?.() },
    { id: "mode-research", group: "Modo", label: "Modo investigación", subtitle: "Búsqueda web profunda", icon: <SearchIcon className="size-3.5" />, run: () => { if (!webSearchEnabled) onToggleWebSearch() } },
    { id: "mode-fast", group: "Modo", label: "Modo rápido", subtitle: "Respuestas sin fuentes", icon: <ZapIcon className="size-3.5" />, run: () => { if (webSearchEnabled) onToggleWebSearch() } },
    { id: "toggle-agent", group: "Modo", label: "Alternar modo agente", subtitle: "Chat ↔ Agente", icon: <ZapIcon className="size-3.5" />, run: () => setAgentMode(agentMode === "agent" ? "chat" : "agent") },
    { id: "reindex", group: "Sistema", label: "Reindexar", subtitle: "Reindexa el catálogo", icon: <RefreshCwIcon className="size-3.5" />, run: () => onReindex?.() },
  ]

  const pickerItems: CompactPickerItem[] = React.useMemo(() => {
    if (!trigger) return []

    if (trigger === "/") {
      const q = query.toLowerCase()
      return slashCommands
        .filter(c => !q || c.label.toLowerCase().includes(q) || c.subtitle.toLowerCase().includes(q))
        .map(c => ({
          id: c.id,
          title: c.label,
          subtitle: c.subtitle,
          icon: c.icon,
          group: c.group,
          onPick: () => {
            const newValue = value.replace(/(?:^|\s)\/\w*$/, "")
            onValueChange(newValue)
            closePicker()
            c.run()
          },
        }))
    }

    // trigger === "@"
    const q = query.toLowerCase()
    const result: CompactPickerItem[] = []

    for (const kind of mentionKindOrder) {
      const sources = mentionSources.filter(s => s.kind === kind)
      if (sources.length === 0) continue
      for (const s of sources) {
        if (q && !s.label.toLowerCase().includes(q) && !s.sublabel?.toLowerCase().includes(q)) continue
        result.push({
          id: `${s.kind}:${s.id}`,
          title: s.label,
          subtitle: s.sublabel,
          icon: mentionIcons[s.kind] ?? <CpuIcon className="size-3.5" />,
          group: mentionGroupLabels[s.kind] ?? s.kind,
          onPick: () => {
            setChips(prev => [
              ...prev.filter(c => c.id !== s.id),
              { id: s.id, kind: s.kind, label: s.label, color: s.color ?? "#8B5CF6" },
            ])
            const newValue = value.replace(/@\w*$/, `@${s.label} `)
            onValueChange(newValue)
            onMentionSelect?.(s)
            closePicker()
          },
        })
      }
    }

    return result
  }, [trigger, query, mentionSources, value, closePicker, webSearchEnabled, onToggleContext, onToggleWebSearch, onNewChat, onClearChat, onExportChat, onReindex, setAgentMode, agentMode])

  // Reset selected index when items change
  React.useEffect(() => {
    setSelectedPickerIndex(0)
  }, [pickerItems.length])

  // Compute pixel anchor for the compact picker portal (before paint)
  React.useLayoutEffect(() => {
    if (trigger !== null && textareaRef.current) {
      try {
        setAnchorPosition(estimateCursorPosition(textareaRef.current))
      } catch {
        const rect = textareaRef.current.getBoundingClientRect()
        setAnchorPosition({ x: rect.left, y: rect.top })
      }
    }
  }, [trigger, cursorPos])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (trigger !== null) {
      if (event.key === "ArrowDown") {
        event.preventDefault()
        setSelectedPickerIndex(prev => Math.min(prev + 1, pickerItems.length - 1))
      } else if (event.key === "ArrowUp") {
        event.preventDefault()
        setSelectedPickerIndex(prev => Math.max(prev - 1, 0))
      } else if (event.key === "Enter") {
        event.preventDefault()
        const item = pickerItems[selectedPickerIndex]
        if (item) item.onPick()
      } else if (event.key === "Escape") {
        event.preventDefault()
        closePicker()
        const newValue = value.replace(/(?:^|\s)[/@]\w*$/, "")
        if (newValue !== value) onValueChange(newValue)
      }
      return
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList || fileList.length === 0) return
    const files = Array.from(fileList)
    for (const f of files) {
      const isImage = f.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif|bmp|tiff)$/i.test(f.name)
      const previewUrl = isImage ? URL.createObjectURL(f) : undefined
      const base64Data = isImage ? await readFileAsBase64(f) : undefined
      setChips((prev) => [
        ...prev,
        { id: `file-${Date.now()}-${f.name}`, kind: "asset" as const, label: f.name, color: "#8B5CF6", file: f, previewUrl, base64Data },
      ])
    }
    e.target.value = ""
  }

  // Clean up blob URLs when component unmounts or chips are removed
  React.useEffect(() => {
    return () => {
      chips.forEach(chip => {
        if (chip.previewUrl) {
          URL.revokeObjectURL(chip.previewUrl)
        }
      })
    }
  }, [])

  const handleDrop = React.useCallback(async (files: File[]) => {
    for (const f of files) {
      const isImage = f.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif|bmp|tiff)$/i.test(f.name)
      const previewUrl = isImage ? URL.createObjectURL(f) : undefined
      const base64Data = isImage ? await readFileAsBase64(f) : undefined
      setChips((prev) => [
        ...prev,
        { id: `file-${Date.now()}-${f.name}`, kind: "asset" as const, label: f.name, color: "#8B5CF6", file: f, previewUrl, base64Data },
      ])
    }
  }, [])

  return (
    <div className="mx-auto w-full max-w-3xl shrink-0 border-t border-border bg-background px-4 py-3 sm:px-5">
      {sessionSummary && <ConversationMemoryBadge summary={sessionSummary} />}

      <DropZone onDrop={handleDrop}>
        <form
          className="rounded-2xl border border-border/80 bg-card/95 p-2 text-card-foreground shadow-xs"
          onSubmit={handleSubmit}
        >
        {activeSkills && activeSkills.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5 px-2">
            {activeSkills.map(skill => (
              <span
                key={skill.id}
                className="inline-flex items-center gap-1 rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary"
              >
                {skill.name}
                <button
                  type="button"
                  onClick={() => onRemoveSkill?.(skill.id)}
                  className="hover:text-destructive ml-0.5"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}

        <InputGroup className="min-h-12 items-center rounded-xl bg-background/95 py-1">
          <InputGroupAddon className="items-center">
            <ToolMenu
              webSearchEnabled={webSearchEnabled}
              onToggleWebSearch={onToggleWebSearch}
              connectors={rawSources?.connectors ?? []}
              mcpServers={rawSources?.mcp_servers ?? []}
              refreshSources={refreshSources}
              onAttachFiles={() => fileInputRef.current?.click()}
            />
          </InputGroupAddon>
          <InputGroupControl className="relative flex items-center">
            <div className="relative w-full">
              {/* Chip bar */}
              {chips.length > 0 && (
                <AttachmentChips
                  chips={chips}
                  onRemoveChip={removeChip}
                />
              )}

              {/* Compact picker (@ or / portal) */}
              {trigger !== null && pickerItems.length > 0 && (
                <CompactPicker
                  items={pickerItems}
                  selectedIndex={selectedPickerIndex}
                  anchorPosition={anchorPosition}
                />
              )}

              <Textarea
                ref={textareaRef}
                rows={1}
                value={value}
                autoComplete="off"
                className="max-h-28 min-h-8 border-0 bg-transparent px-1 py-1.5 text-base leading-5 shadow-none focus-visible:ring-0 md:text-sm"
                placeholder={agentMode === "agent" ? "Describe la tarea que quieres que realice el agente..." : "Pregunta lo que quieras   ·   / para comandos   ·   @ para adjuntar fuentes"}
                onChange={(event) => handleComposerChange(event.target.value, event)}
                onKeyDown={handleKeyDown}
              />
            </div>
          </InputGroupControl>
          <InputGroupAddon className="items-center">
            <AudioRecorder
              onTranscription={(text) => {
                onValueChange(value ? `${value} ${text}` : text)
              }}
              disabled={pending}
            />

            {pending ? (
              <Button
                type="button"
                size="icon"
                className="rounded-xl bg-red-500 hover:bg-red-600 text-white"
                aria-label="Detener análisis"
                onClick={onStop}
              >
                <StopCircleIcon className="size-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                className="rounded-xl"
                aria-label="Enviar mensaje"
                disabled={!value.trim() || !activeProvider}
              >
                <SendIcon className="size-4" />
              </Button>
            )}
          </InputGroupAddon>
        </InputGroup>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="mt-2 flex flex-wrap gap-1.5 px-2">
          <Button
            type="button"
            variant={contextActive ? "default" : "outline"}
            size="sm"
            onClick={onToggleContext}
          >
            <SparklesIcon className="size-4" />
            {contextActive ? "Contexto activo" : "Usar contexto GIS"}
          </Button>

          {reasoningEffort != null && onReasoningEffortChange && (
            <ReasoningToggle
              value={reasoningEffort}
              onChange={onReasoningEffortChange}
            />
          )}
        </div>

        {webSearchEnabled && (
          <div className="mt-2 flex items-center gap-1.5 px-2">
            <GlobeIcon className="size-3 text-emerald-500" />
            <span className="text-[11px] text-emerald-500 font-medium">
              Busqueda web activa
            </span>
            <button
              type="button"
              onClick={onToggleWebSearch}
              className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Desactivar busqueda web"
            >
              <XIcon className="size-3" />
            </button>
          </div>
        )}

        {pending && webSearchEnabled && (
          <div className="mt-2 flex items-center gap-1.5 px-2">
            <Loader2 className="size-3 text-blue-500 animate-spin" />
            <span className="text-[11px] text-blue-500 font-medium">
              Deep Research activo...
            </span>
          </div>
        )}

        {(error) ? (
          <p className="mt-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </form>
      </DropZone>
    </div>
  )
}
