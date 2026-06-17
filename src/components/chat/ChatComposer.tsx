import * as React from "react"
import {
  CloudIcon,
  CpuIcon,
  FileTextIcon,
  GitForkIcon,
  GlobeIcon,
  Loader2,
  SendIcon,
  SparklesIcon,
  StopCircleIcon,
  XIcon,
} from "lucide-react"

import { Button } from "@/components/ui/Button"
import { ModelSelector } from "@/components/chat/ModelSelector"
import { CommandPalette } from "@/components/chat/CommandPalette"
import { MentionPicker } from "@/components/chat/MentionPicker"
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
import type { MentionSource, MentionableSourcesResponse, SlashCommand, MentionKind } from "@/types/chat"
import type { AgentSourceType } from "@/types/agents"
import { parseMentions } from "@/features/workspace/chat/MentionPicker"
import { ToolMenu } from "@/components/chat/ToolMenu"
import { AttachmentChips, type Chip } from "@/components/chat/AttachmentChips"

export type ChatComposerProps = {
  value: string
  onValueChange: (value: string) => void
  activeProvider: { provider: string; model: string; endpoint: string } | null
  error: string | null
  pending: boolean
  onSubmit: (content: string, mentions?: { assetIds: string[]; connectorIds: string[]; nodeIds: string[]; agentSources?: AgentSourceType[]; skillNames?: string[] }, attachments?: FileAttachment[]) => void
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
  onToggleCoding?: () => void
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
  onToggleCoding,
}: ChatComposerProps) {
  const [slashQuery, setSlashQuery] = React.useState<string | null>(null)
  const slashContainerRef = React.useRef<HTMLDivElement | null>(null)
  const [showMentionPicker, setShowMentionPicker] = React.useState(false)
  const [mentionQuery, setMentionQuery] = React.useState("")
  const [chips, setChips] = React.useState<Chip[]>([])
  const mentionContainerRef = React.useRef<HTMLDivElement | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
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
    if (!rawSources) return []
    const result: MentionSource[] = []

    for (const c of rawSources.connectors) {
      result.push({
        id: c.id, kind: "connector", label: c.label, sublabel: c.sublabel,
        icon: c.icon, color: c.color, status: c.status,
        contextPayload: { type: "connector", id: c.id },
      })
    }
    for (const a of rawSources.assets) {
      result.push({
        id: a.id, kind: "asset", label: a.label, sublabel: a.sublabel,
        icon: a.icon, color: a.color,
        contextPayload: { type: "asset", id: a.id },
      })
    }
    for (const n of rawSources.graph_nodes) {
      result.push({
        id: n.id, kind: "graph_node", label: n.label, sublabel: n.sublabel,
        icon: n.icon, color: n.color,
        contextPayload: { type: "graph_node", id: n.id },
      })
    }

    for (const s of skillSources) result.push(s)

    const AGENT_SOURCES: { id: AgentSourceType; label: string; sublabel: string; icon: string; color: string }[] = [
      { id: "memory",     label: "Memoria",     sublabel: "Memoria semántica (ChromaDB)", icon: "Database",     color: "#8B5CF6" },
      { id: "qgis",       label: "QGIS",        sublabel: "Capas y procesos QGIS",         icon: "Map",          color: "#10B981" },
      { id: "arcgis",     label: "ArcGIS",      sublabel: "ArcGIS Online / Portal",         icon: "Globe",        color: "#3B82F6" },
      { id: "onedrive",   label: "OneDrive",    sublabel: "Buscar en OneDrive",             icon: "Cloud",        color: "#F59E0B" },
      { id: "filesystem", label: "Archivos",    sublabel: "Carpetas locales",               icon: "Folder",       color: "#6B7280" },
      { id: "graph",      label: "Grafo",       sublabel: "Knowledge Graph",                icon: "GitFork",      color: "#EC4899" },
      { id: "github",     label: "GitHub",      sublabel: "Repositorios Git",               icon: "Code2",        color: "#1F2937" },
    ]
    for (const s of AGENT_SOURCES) {
      result.push({
        id: s.id, kind: "agent_source" as MentionKind, label: s.label, sublabel: s.sublabel,
        icon: s.icon, color: s.color,
        contextPayload: { type: "agent_source" as MentionKind, id: s.id },
      })
    }

    return result
  }, [rawSources, skillSources])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const clean = value.trim()
    if (!clean || pending) return

    const assetIds: string[] = []
    const connectorIds: string[] = []
    const nodeIds: string[] = []
    const agentSources: AgentSourceType[] = []
    const skillNamesFromChips: string[] = []
    const attachments: FileAttachment[] = []

    let finalContent = clean
    for (const chip of chips) {
      finalContent = finalContent.replace(`@${chip.label}`, `@[${chip.label}](${chip.kind}:${chip.id})`)
      if (chip.kind === "asset") {
        assetIds.push(chip.id)
        if (chip.file) {
          attachments.push({
            id: chip.id, name: chip.file.name, type: chip.file.type,
            size: chip.file.size, data: chip.base64Data, previewUrl: chip.previewUrl,
          })
        }
      }
      else if (chip.kind === "connector") connectorIds.push(chip.id)
      else if (chip.kind === "graph_node") nodeIds.push(chip.id)
      else if (chip.kind === "agent_source") agentSources.push(chip.id as AgentSourceType)
      else if (chip.kind === "skill") skillNamesFromChips.push(chip.id)
    }

    const { mentions: textMentions } = parseMentions(finalContent)
    const allAgentSources = [...new Set([...agentSources, ...textMentions])]

    onValueChange("")
    setChips([])
    setShowMentionPicker(false)
    setSlashQuery(null)

    onSubmit(finalContent, { 
      assetIds, connectorIds, nodeIds, 
      agentSources: allAgentSources.length > 0 ? allAgentSources : undefined, 
      skillNames: skillNamesFromChips.length > 0 ? skillNamesFromChips : undefined 
    }, attachments.length > 0 ? attachments : undefined)
  }

  const handleComposerChange = (newValue: string) => {
    onValueChange(newValue)
    const atMatch = newValue.match(/@(\w*)$/)
    if (atMatch) {
      setMentionQuery(atMatch[1])
      setShowMentionPicker(true)
      setSlashQuery(null)
    } else {
      setShowMentionPicker(false)
    }

    const slashMatch = newValue.match(/(?:^|\s)\/(\w*)$/)
    if (slashMatch) {
      setSlashQuery(slashMatch[1])
      setShowMentionPicker(false)
    } else {
      setSlashQuery(null)
    }
  }

  const handleMentionSelect = (source: MentionSource) => {
    setChips((prev) => [
      ...prev.filter((c) => c.id !== source.id),
      { id: source.id, kind: source.kind, label: source.label, color: source.color ?? "#8B5CF6" },
    ])
    setShowMentionPicker(false)
    onValueChange(value.replace(/@\w*$/, `@${source.label} `))
    onMentionSelect?.(source)
  }

  const removeChip = (id: string) => {
    setChips((prev) => prev.filter((c) => c.id !== id))
  }

  const handleSlashSelect = (cmd: SlashCommand) => {
    setSlashQuery(null)
    onValueChange(value.replace(/(?:^|\s)\/\w*$/, ""))

    switch (cmd.id) {
      case "use-graph": onToggleContext(); break
      case "mode-research": if (!webSearchEnabled) onToggleWebSearch(); break
      case "mode-fast": if (webSearchEnabled) onToggleWebSearch(); break
      case "attach-file": case "attach-asset": fileInputRef.current?.click(); break
      case "toggle-coding": onToggleCoding?.(); break
      case "new-chat": onNewChat?.(); break
      case "clear-chat": onClearChat?.(); break
      case "export-chat": onExportChat?.(); break
      case "reindex": onReindex?.(); break
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const popupOpen = showMentionPicker || slashQuery !== null
    if (popupOpen) {
      if (["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(event.key)) {
        event.preventDefault()
        const target = mentionContainerRef.current ?? slashContainerRef.current
        target?.dispatchEvent(new KeyboardEvent("keydown", { key: event.key, bubbles: true }))
      }
      if (event.key === "Escape") {
        setShowMentionPicker(false); setSlashQuery(null)
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
    const files = Array.from(e.target.files || [])
    for (const f of files) {
      const isImage = f.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif|bmp|tiff)$/i.test(f.name)
      const previewUrl = isImage ? URL.createObjectURL(f) : undefined
      const base64Data = isImage ? await readFileAsBase64(f) : undefined
      setChips((prev) => [...prev, { 
        id: `file-${Date.now()}-${f.name}`, kind: "asset" as const, label: f.name, 
        color: "#8B5CF6", file: f, previewUrl, base64Data 
      }])
    }
    e.target.value = ""
  }

  React.useEffect(() => {
    return () => chips.forEach(c => c.previewUrl && URL.revokeObjectURL(c.previewUrl))
  }, [])

  const handleDrop = React.useCallback(async (files: File[]) => {
    for (const f of files) {
      const isImage = f.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif|bmp|tiff)$/i.test(f.name)
      const previewUrl = isImage ? URL.createObjectURL(f) : undefined
      const base64Data = isImage ? await readFileAsBase64(f) : undefined
      setChips((prev) => [...prev, { 
        id: `file-${Date.now()}-${f.name}`, kind: "asset" as const, label: f.name, 
        color: "#8B5CF6", file: f, previewUrl, base64Data 
      }])
    }
  }, [])

  return (
    <div className="mx-auto w-full max-w-3xl shrink-0 border-t border-border bg-background px-4 py-3 sm:px-5">
      {sessionSummary && <ConversationMemoryBadge summary={sessionSummary} />}
      <DropZone onDrop={handleDrop}>
        <form className="rounded-2xl border border-border/80 bg-card/95 p-2 shadow-xs" onSubmit={handleSubmit}>
          {activeSkills && activeSkills.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5 px-2">
              {activeSkills.map(s => (
                <span key={s.id} className="inline-flex items-center gap-1 rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {s.name}
                  <button type="button" onClick={() => onRemoveSkill?.(s.id)} className="hover:text-destructive ml-0.5">✕</button>
                </span>
              ))}
            </div>
          )}
          <InputGroup className="min-h-12 items-center rounded-xl bg-background/95 py-1">
            <InputGroupAddon className="items-center">
              <ToolMenu
                webSearchEnabled={webSearchEnabled} onToggleWebSearch={onToggleWebSearch}
                connectors={rawSources?.connectors ?? []} refreshSources={refreshSources}
                onAttachFiles={() => fileInputRef.current?.click()} onToggleCoding={onToggleCoding}
              />
            </InputGroupAddon>
            <InputGroupControl className="relative flex items-center">
              <div className="relative w-full">
                {chips.length > 0 && <AttachmentChips chips={chips} onRemoveChip={removeChip} />}
                {slashQuery !== null && <CommandPalette query={slashQuery} onSelect={handleSlashSelect} onClose={() => setSlashQuery(null)} containerRef={slashContainerRef} />}
                {showMentionPicker && <MentionPicker query={mentionQuery} sources={mentionSources} onSelect={handleMentionSelect} onClose={() => setShowMentionPicker(false)} containerRef={mentionContainerRef} />}
                <Textarea
                  rows={1} value={value} autoComplete="off"
                  className="max-h-28 min-h-8 border-0 bg-transparent px-1 py-1.5 text-base leading-5 shadow-none focus-visible:ring-0 md:text-sm"
                  placeholder="Pregunta lo que quieras   ·   / para comandos   ·   @ para adjuntar"
                  onChange={(e) => handleComposerChange(e.target.value)} onKeyDown={handleKeyDown}
                />
              </div>
            </InputGroupControl>
            <InputGroupAddon className="items-center">
              <AudioRecorder onTranscription={(t) => onValueChange(value ? `${value} ${t}` : t)} disabled={pending} />
              {pending ? (
                <Button type="button" size="icon" className="rounded-xl bg-red-500 hover:bg-red-600 text-white" onClick={onStop}>
                  <StopCircleIcon className="size-4" />
                </Button>
              ) : (
                <Button type="submit" size="icon" className="rounded-xl" disabled={!value.trim() || !activeProvider}>
                  <SendIcon className="size-4" />
                </Button>
              )}
            </InputGroupAddon>
          </InputGroup>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
          <div className="mt-2 flex flex-wrap gap-1.5 px-2">
            <Button type="button" variant={contextActive ? "default" : "outline"} size="sm" onClick={onToggleContext}>
              <SparklesIcon className="size-4" />
              {contextActive ? "Contexto activo" : "Usar contexto GIS"}
            </Button>
          </div>
          {webSearchEnabled && (
            <div className="mt-2 flex items-center gap-1.5 px-2">
              <GlobeIcon className="size-3 text-emerald-500" />
              <span className="text-[11px] text-emerald-500 font-medium">Busqueda web activa</span>
              <button type="button" onClick={onToggleWebSearch} className="ml-auto text-muted-foreground hover:text-foreground transition-colors"><XIcon className="size-3" /></button>
            </div>
          )}
          {pending && webSearchEnabled && (
            <div className="mt-2 flex items-center gap-1.5 px-2">
              <Loader2 className="size-3 text-blue-500 animate-spin" />
              <span className="text-[11px] text-blue-500 font-medium">Deep Research activo...</span>
            </div>
          )}
          {error && <p className="mt-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
        </form>
      </DropZone>
    </div>
  )
}
