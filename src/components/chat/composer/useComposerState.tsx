import * as React from "react"
import {
  CloudIcon, CpuIcon, DatabaseIcon, DownloadIcon,
  FileTextIcon, GitForkIcon, GlobeIcon, Loader2,
  PaperclipIcon, PlusIcon, PuzzleIcon, RefreshCwIcon,
  SearchIcon, ServerIcon, SparklesIcon, Trash2Icon,
  ZapIcon,
} from "lucide-react"

import type { ChatComposerProps } from "@/components/chat/ChatComposer"
import { usePickerTrigger } from "@/hooks/usePickerTrigger"
import { getMentionableSources } from "@/api/chat"
import { listSkills } from "@/api/skills"
import { parseMentions } from "@/features/workspace/chat/MentionPicker"
import { useAgentTaskStore } from "@/features/agent/store/useAgentTaskStore"
import type { Chip } from "@/components/chat/AttachmentChips"
import type { MentionSource, MentionableSourcesResponse, MentionKind, FileAttachment } from "@/types/chat"
import type { AgentSourceType } from "@/types/agents"
import type { CompactPickerItem } from "@/components/chat/CompactPicker"
import type { ReasoningEffort } from "@/features/chat/ReasoningToggle"
import { usePasteImage } from "@/components/chat/composer/usePasteImage"

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

type ComposerState = {
  chips: Chip[]
  cursorPos: number
  selectedPickerIndex: number
  anchorPosition: { x: number; y: number }
  trigger: string | null
  query: string
  pickerItems: CompactPickerItem[]
  mentionSources: MentionSource[]
  rawSources: MentionableSourcesResponse | null
  skillSources: MentionSource[]
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  handleComposerChange: (newValue: string, event: React.ChangeEvent<HTMLTextAreaElement>) => void
  handleKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  handleDrop: (files: File[]) => Promise<void>
  handlePasteImage: (file: File, dataUrl: string) => void
  removeChip: (id: string) => void
  closePicker: () => void
  setCursorPos: React.Dispatch<React.SetStateAction<number>>
  setSelectedPickerIndex: React.Dispatch<React.SetStateAction<number>>
  setAnchorPosition: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>
  fileInputRef: React.RefObject<HTMLInputElement>
  textareaRef: React.RefObject<HTMLTextAreaElement>
  refreshSources: () => void
  mentionIcons: Record<MentionKind, React.ReactNode>
  mentionGroupLabels: Record<MentionKind, string>
  mentionKindOrder: MentionKind[]
}

export function useComposerState(props: ChatComposerProps): ComposerState {
  const {
    value,
    onValueChange,
    onSubmit,
    onToggleContext,
    webSearchEnabled,
    onToggleWebSearch,
    onMentionSelect,
    onNewChat,
    onClearChat,
    onExportChat,
    onReindex,
    pending,
  } = props

  const createTask = useAgentTaskStore((s) => s.createTask)
  const agentMode = useAgentTaskStore((s) => s.mode)
  const setAgentMode = useAgentTaskStore((s) => s.setMode)
  const [chips, setChips] = React.useState<Chip[]>([])
  const [cursorPos, setCursorPos] = React.useState(0)
  const [selectedPickerIndex, setSelectedPickerIndex] = React.useState(0)
  const [anchorPosition, setAnchorPosition] = React.useState({ x: 0, y: 0 })
  const fileInputRef = React.useRef<HTMLInputElement>(null!)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null!)

  const handlePasteImage = React.useCallback((file: File, dataUrl: string) => {
    const previewUrl = URL.createObjectURL(file)
    setChips((prev) => [
      ...prev,
      { id: `paste-${Date.now()}-${file.name}`, kind: "asset" as const, label: file.name, color: "#8B5CF6", file, previewUrl, base64Data: dataUrl },
    ])
  }, [])

  usePasteImage({ onImage: handlePasteImage, enabled: true })

  const { trigger, query, close: closePicker } = usePickerTrigger(value, cursorPos)

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
          id: c.id, kind: "connector", label: c.label, sublabel: c.sublabel,
          icon: c.icon, color: c.color, status: c.status,
          contextPayload: { type: "connector", id: c.id },
        })
      }
      for (const m of rawSources.mcp_servers ?? []) {
        result.push({
          id: m.id, kind: "mcp_server", label: m.label, sublabel: m.sublabel,
          icon: m.icon, color: m.color, status: m.status,
          contextPayload: { type: "mcp_server", id: m.id },
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
            id: chip.id, name: chip.file.name, type: chip.file.type,
            size: chip.file.size, data: chip.base64Data, previewUrl: chip.previewUrl,
          })
        }
      } else if (chip.kind === "connector") connectorIds.push(chip.id)
      else if (chip.kind === "mcp_server") mcpServerIds.push(chip.id)
      else if (chip.kind === "graph_node") nodeIds.push(chip.id)
      else if (chip.kind === "agent_source") agentSources.push(chip.id as AgentSourceType)
      else if (chip.kind === "skill") skillNamesFromChips.push(chip.id)
    }

    const { mentions: textMentions } = parseMentions(finalContent)
    const allAgentSources = [...new Set([...agentSources, ...textMentions])]

    onValueChange("")
    setChips([])
    closePicker()

    const allSkillNames = skillNamesFromChips.length > 0 ? skillNamesFromChips : undefined
    onSubmit(finalContent, {
      assetIds, connectorIds, mcpServerIds, nodeIds,
      agentSources: allAgentSources.length > 0 ? allAgentSources : undefined,
      skillNames: allSkillNames,
    }, attachments.length > 0 ? attachments : undefined)
  }

  const handleComposerChange = (newValue: string, event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCursorPos(event.target.selectionStart)
    onValueChange(newValue)
  }

  const mentionIcons: Record<MentionKind, React.ReactNode> = {
    connector: <CloudIcon className="size-3.5" />,
    asset: <FileTextIcon className="size-3.5" />,
    graph_node: <GitForkIcon className="size-3.5" />,
    agent_source: <CpuIcon className="size-3.5" />,
    skill: <PuzzleIcon className="size-3.5" />,
    mcp_server: <ServerIcon className="size-3.5" />,
  }

  const mentionGroupLabels: Record<MentionKind, string> = {
    connector: "Conectores", asset: "Assets", graph_node: "Grafo",
    agent_source: "Agentes", skill: "Skills", mcp_server: "Servidores MCP",
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
          id: c.id, title: c.label, subtitle: c.subtitle, icon: c.icon, group: c.group,
          onPick: () => {
            const newValue = value.replace(/(?:^|\s)\/\w*$/, "")
            onValueChange(newValue)
            closePicker()
            c.run()
          },
        }))
    }

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

  const removeChip = (id: string) => {
    setChips((prev) => prev.filter((c) => c.id !== id))
  }

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

  return {
    chips, cursorPos, selectedPickerIndex, anchorPosition,
    trigger, query, pickerItems, mentionSources, rawSources, skillSources,
    handleSubmit, handleComposerChange, handleKeyDown,
    handleFileChange, handleDrop, handlePasteImage,
    removeChip, closePicker,
    setCursorPos, setSelectedPickerIndex, setAnchorPosition,
    fileInputRef, textareaRef, refreshSources,
    mentionIcons, mentionGroupLabels, mentionKindOrder,
  }
}
