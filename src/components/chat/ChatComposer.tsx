import * as React from "react"
import {
  AudioLinesIcon,
  CloudIcon,
  CpuIcon,
  DownloadIcon,
  FileSearchIcon,
  FileTextIcon,
  FolderIcon,
  GitForkIcon,
  GlobeIcon,
  HexagonIcon,
  Loader2,
  MapPinIcon,
  MenuIcon,
  MicIcon,
  PlusIcon,
  SearchIcon,
  SendIcon,
  Share2Icon,
  SparklesIcon,
  XIcon,
} from "lucide-react"

import { Button } from "@/components/ui/Button"
import { ModelSelector } from "@/components/chat/ModelSelector"
import { CommandPalette } from "@/components/chat/CommandPalette"
import { MentionPicker } from "@/components/chat/MentionPicker"
import { SkillActivationBadge } from "@/features/workspace/skills/SkillActivationBadge"
import type { SkillInfo } from "@/types/chat"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupControl,
} from "@/components/ui/input-group"
import { Textarea } from "@/components/ui/Textarea"
import { ConnectorStatusBadge } from "@/components/chat/ConnectorStatusBadge"
import { ConnectorMiniPanel } from "@/components/chat/ConnectorMiniPanel"
import { ConnectorConnectionDialog } from "@/components/chat/ConnectorConnectionDialog"
import { ShapefileConnectorDialog } from "@/components/chat/ShapefileConnectorDialog"
import { getMentionableSources } from "@/api/chat"
import { listSkills } from "@/api/skills"
import type { MentionSource, MentionableSourceItem, MentionableSourcesResponse, SlashCommand, MentionKind } from "@/types/chat"
import type { AgentSourceType } from "@/types/agents"
import { parseMentions } from "@/features/workspace/chat/MentionPicker"

export type ChatComposerProps = {
  value: string
  onValueChange: (value: string) => void
  activeProvider: { provider: string; model: string; endpoint: string } | null
  error: string | null
  pending: boolean
  onSubmit: (content: string, mentions?: { assetIds: string[]; connectorIds: string[]; nodeIds: string[]; agentSources?: AgentSourceType[]; skillNames?: string[] }) => void
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
}

type Chip = {
  id: string
  kind: MentionSource["kind"]
  label: string
  color: string
}

export function ChatComposer({
  value,
  onValueChange,
  activeProvider,
  error,
  pending,
  onSubmit,
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
}: ChatComposerProps) {
  // Slash command state
  const [slashQuery, setSlashQuery] = React.useState<string | null>(null)
  const slashContainerRef = React.useRef<HTMLDivElement | null>(null)

  // Mention state
  const [showMentionPicker, setShowMentionPicker] = React.useState(false)
  const [mentionQuery, setMentionQuery] = React.useState("")
  const [chips, setChips] = React.useState<Chip[]>([])
  const mentionContainerRef = React.useRef<HTMLDivElement | null>(null)

  // Hidden file input for attach-file
  const fileInputRef = React.useRef<HTMLInputElement>(null)

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
    if (!rawSources) return []
    const result: MentionSource[] = []

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

    // Skills
    for (const s of skillSources) {
      result.push(s)
    }

    // Agent sources
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
        id: s.id,
        kind: "agent_source" as MentionKind,
        label: s.label,
        sublabel: s.sublabel,
        icon: s.icon,
        color: s.color,
        contextPayload: { type: "agent_source" as MentionKind, id: s.id },
      })
    }

    return result
  }, [rawSources])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const clean = value.trim()
    if (!clean || pending) return

    const assetIds: string[] = []
    const connectorIds: string[] = []
    const nodeIds: string[] = []
    const agentSources: AgentSourceType[] = []
    const skillNamesFromChips: string[] = []

    let finalContent = clean
    for (const chip of chips) {
      finalContent = finalContent.replace(
        `@${chip.label}`,
        `@[${chip.label}](${chip.kind}:${chip.id})`
      )
      if (chip.kind === "asset") assetIds.push(chip.id)
      else if (chip.kind === "connector") connectorIds.push(chip.id)
      else if (chip.kind === "graph_node") nodeIds.push(chip.id)
      else if (chip.kind === "agent_source") agentSources.push(chip.id as AgentSourceType)
      else if (chip.kind === "skill") skillNamesFromChips.push(chip.id)
    }

    // Merge text-parsed mentions with chip-based mentions
    const { mentions: textMentions } = parseMentions(finalContent)
    const allAgentSources = [...new Set([...agentSources, ...textMentions])]

    onValueChange("")
    setChips([])
    setShowMentionPicker(false)
    setSlashQuery(null)

    const allSkillNames = skillNamesFromChips.length > 0 ? skillNamesFromChips : undefined
    onSubmit(finalContent, { assetIds, connectorIds, nodeIds, agentSources: allAgentSources.length > 0 ? allAgentSources : undefined, skillNames: allSkillNames })
  }

  const handleComposerChange = (newValue: string) => {
    onValueChange(newValue)

    // Detect @mention trigger
    const atMatch = newValue.match(/@(\w*)$/)
    if (atMatch) {
      setMentionQuery(atMatch[1])
      setShowMentionPicker(true)
      setSlashQuery(null)
    } else {
      setShowMentionPicker(false)
    }

    // Detect /slash trigger (at start or after space)
    const slashMatch = newValue.match(/(?:^|\s)\/(\w*)$/)
    if (slashMatch) {
      setSlashQuery(slashMatch[1])
      setShowMentionPicker(false)
    } else {
      setSlashQuery(null)
    }
  }

  // Extract agent source mentions from text (also handle via chips)
  const agentMentionsFromText = React.useMemo(() => {
    const { mentions } = parseMentions(value)
    return mentions
  }, [value])

  const handleMentionSelect = (source: MentionSource) => {
    setChips((prev) => [
      ...prev.filter((c) => c.id !== source.id),
      { id: source.id, kind: source.kind, label: source.label, color: source.color ?? "#8B5CF6" },
    ])
    setShowMentionPicker(false)

    const newValue = value.replace(/@\w*$/, `@${source.label} `)
    onValueChange(newValue)
    onMentionSelect?.(source)
  }

  const removeChip = (id: string) => {
    setChips((prev) => prev.filter((c) => c.id !== id))
  }

  const handleSlashSelect = (cmd: SlashCommand) => {
    setSlashQuery(null)
    const newValue = value.replace(/(?:^|\s)\/\w*$/, "")
    onValueChange(newValue)

    switch (cmd.id) {
      case "use-graph":
        onToggleContext()
        break
      case "mode-research":
        if (!webSearchEnabled) onToggleWebSearch()
        break
      case "mode-fast":
        if (webSearchEnabled) onToggleWebSearch()
        break
      case "attach-file":
        fileInputRef.current?.click()
        break
      case "attach-asset":
        // For now, just trigger context panel or file picker fallback
        fileInputRef.current?.click()
        break
      case "new-chat":
        onNewChat?.()
        break
      case "clear-chat":
        onClearChat?.()
        break
      case "export-chat":
        onExportChat?.()
        break
      case "reindex":
        onReindex?.()
        break
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const popupOpen = showMentionPicker || slashQuery !== null

    if (popupOpen) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === "Escape") {
        event.preventDefault()
        const target = mentionContainerRef.current ?? slashContainerRef.current
        target?.dispatchEvent(
          new KeyboardEvent("keydown", { key: event.key, bubbles: true })
        )
      }
      if (event.key === "Escape") {
        setShowMentionPicker(false)
        setSlashQuery(null)
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList || fileList.length === 0) return
    const files = Array.from(fileList)
    for (const f of files) {
      setChips((prev) => [
        ...prev,
        { id: `file-${Date.now()}-${f.name}`, kind: "asset" as const, label: f.name, color: "#8B5CF6" },
      ])
    }
    e.target.value = ""
  }

  return (
    <div className="mx-auto w-full max-w-3xl shrink-0 border-t border-border bg-background px-4 py-3 sm:px-5">
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
              refreshSources={refreshSources}
              onAttachFiles={() => fileInputRef.current?.click()}
            />
          </InputGroupAddon>
          <InputGroupControl className="relative flex items-center">
            <div className="relative w-full">
              {/* Chip bar */}
              {chips.length > 0 && (
                <div className="mb-1 flex flex-wrap gap-1">
                  {chips.map((chip) => {
                    const Icon = chip.kind === "graph_node" ? GitForkIcon : chip.kind === "asset" ? FileTextIcon : CloudIcon
                    return (
                      <span
                        key={chip.id}
                        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6rem] font-medium"
                        style={{
                          backgroundColor: `${chip.color}18`,
                          border: `1px solid ${chip.color}44`,
                          color: chip.color,
                        }}
                      >
                        <Icon className="size-2.5" />
                        @{chip.label}
                        <button
                          type="button"
                          onClick={() => removeChip(chip.id)}
                          className="hover:opacity-70"
                        >
                          <XIcon className="size-2.5" />
                        </button>
                      </span>
                    )
                  })}
                </div>
              )}

              {/* Command Palette (/ popup) */}
              {slashQuery !== null && (
                <CommandPalette
                  query={slashQuery}
                  onSelect={handleSlashSelect}
                  onClose={() => {
                    setSlashQuery(null)
                    const newValue = value.replace(/(?:^|\s)\/\w*$/, "")
                    if (newValue !== value) onValueChange(newValue)
                  }}
                  containerRef={slashContainerRef}
                />
              )}

              {/* Mention Picker (@ popup) */}
              {showMentionPicker && (
                <MentionPicker
                  query={mentionQuery}
                  sources={mentionSources}
                  onSelect={handleMentionSelect}
                  onClose={() => setShowMentionPicker(false)}
                  containerRef={mentionContainerRef}
                />
              )}

              <Textarea
                rows={1}
                value={value}
                autoComplete="off"
                className="max-h-28 min-h-8 border-0 bg-transparent px-1 py-1.5 text-base leading-5 shadow-none focus-visible:ring-0 md:text-sm"
                placeholder="Pregunta lo que quieras   ·   / para comandos   ·   @ para adjuntar fuentes"
                onChange={(event) => handleComposerChange(event.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          </InputGroupControl>
          <InputGroupAddon className="items-center">
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Grabar audio">
              <MicIcon className="size-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Modo voz">
              <AudioLinesIcon className="size-4" />
            </Button>

            <Button
              type="submit"
              size="icon"
              className="rounded-xl"
              aria-label="Enviar mensaje"
              disabled={pending || !value.trim() || !activeProvider}
            >
              <SendIcon className="size-4" />
            </Button>
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

        {error ? (
          <p className="mt-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  )
}

function ToolMenu({
  webSearchEnabled,
  onToggleWebSearch,
  connectors,
  refreshSources,
  onAttachFiles,
}: {
  webSearchEnabled: boolean
  onToggleWebSearch: () => void
  connectors: MentionableSourceItem[]
  refreshSources: () => void
  onAttachFiles: () => void
}) {
  const [expandedConnector, setExpandedConnector] = React.useState<string | null>(null)
  const [connectingConnector, setConnectingConnector] = React.useState<MentionableSourceItem | null>(null)
  const [showShapefileDialog, setShowShapefileDialog] = React.useState(false)

  return (
    <>
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open) {
          setExpandedConnector(null)
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="rounded-xl"
          aria-label="Abrir herramientas"
        >
          <PlusIcon className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="top"
        sideOffset={10}
        className="w-80 rounded-xl p-2"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel>Proyecto</DropdownMenuLabel>
          <DropdownMenuItem className="min-h-8 gap-2 px-2.5 py-1.5">
            <SparklesIcon className="size-3.5 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">Agregar proyecto</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="min-h-8 gap-2 px-2.5 py-1.5">
            <MenuIcon className="size-3.5 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">Configurar proyecto</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Archivos y datos</DropdownMenuLabel>
          <DropdownMenuItem
            className="min-h-8 gap-2 px-2.5 py-1.5"
            onSelect={() => {
              setConnectingConnector({
                id: "new-local",
                kind: "connector",
                label: "Carpeta local",
                sublabel: "Nuevo conector",
                icon: "Folder",
                color: "#F59E0B",
                status: "disconnected",
                last_synced: null,
                asset_count: null,
                provider: "local",
              })
            }}
          >
            <FolderIcon className="size-3.5 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">
              Carpeta local
            </span>
            <DropdownMenuShortcut className="ml-2 rounded-md bg-muted px-1.5 py-0.5 text-[0.65rem] font-medium tracking-normal text-muted-foreground">
              LOCAL
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="min-h-8 gap-2 px-2.5 py-1.5"
            onSelect={() => {
              setShowShapefileDialog(true)
            }}
          >
            <MapPinIcon className="size-3.5 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">
              Shapefile
            </span>
            <DropdownMenuShortcut className="ml-2 rounded-md bg-muted px-1.5 py-0.5 text-[0.65rem] font-medium tracking-normal text-muted-foreground">
              SHP
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="min-h-8 gap-2 px-2.5 py-1.5"
            onSelect={onAttachFiles}
          >
            <PlusIcon className="size-3.5 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">
              Agregar fotos y archivos
            </span>
            <DropdownMenuShortcut className="ml-2 rounded-md bg-muted px-1.5 py-0.5 text-[0.65rem] font-medium tracking-normal text-muted-foreground">
              PDF/DXF
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          {connectors.map((c) => (
            <React.Fragment key={c.id}>
              <DropdownMenuItem
                className="min-h-8 gap-2 px-2.5 py-1.5"
                onSelect={(e) => {
                  if (c.status === "connected" || c.status === "error") {
                    e.preventDefault()
                    setExpandedConnector(
                      expandedConnector === c.id ? null : c.id
                    )
                  } else if (c.status === "disconnected") {
                    setConnectingConnector(c)
                  }
                }}
              >
                <CpuIcon className="size-3.5 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{c.label}</span>
                {c.status && <ConnectorStatusBadge status={c.status} />}
              </DropdownMenuItem>
              {expandedConnector === c.id && (
                <ConnectorMiniPanel
                  connector={c}
                  onClose={() => setExpandedConnector(null)}
                  onSync={
                    c.status === "connected"
                      ? () => {
                          // TODO: trigger sync
                          setExpandedConnector(null)
                        }
                      : undefined
                  }
                />
              )}
            </React.Fragment>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Herramientas GIS</DropdownMenuLabel>
          <DropdownMenuItem className="gap-3 px-3 py-2">
            <SearchIcon className="size-4" />
            Razonamiento GIS
            <DropdownMenuShortcut>MCP</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="flex items-center justify-between gap-2 px-3 py-2"
            onSelect={(e) => e.preventDefault()}
          >
            <div className="flex items-center gap-3">
              <GlobeIcon className="size-4 text-muted-foreground" />
              <span className="text-sm">Buscar informacion</span>
            </div>
            <Switch
              checked={webSearchEnabled}
              onCheckedChange={onToggleWebSearch}
              className="scale-75"
              aria-label="Activar busqueda en internet"
            />
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-3 px-3 py-2">
              <PlusIcon className="size-4" />
              Mas
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-56 rounded-xl p-2">
              <DropdownMenuItem>
                <FileSearchIcon className="size-3.5 mr-2" />
                Consultar norma POT
              </DropdownMenuItem>
              <DropdownMenuItem>
                <HexagonIcon className="size-3.5 mr-2" />
                Ejecutar buffer
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Share2Icon className="size-3.5 mr-2" />
                Exportar analisis
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="gap-3 px-3 py-2">
            <DownloadIcon className="size-4" />
            Proyectos
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
    {connectingConnector && (
      <ConnectorConnectionDialog
        connector={connectingConnector}
        open={!!connectingConnector}
        onOpenChange={() => setConnectingConnector(null)}
        onConnected={() => {
          setConnectingConnector(null)
          refreshSources()
        }}
      />
    )}
    <ShapefileConnectorDialog
      connector={{
        id: "shapefile-connector",
        kind: "connector",
        label: "Shapefile",
        sublabel: "Archivo .shp local",
        icon: "MapPin",
        color: "#F59E0B",
        status: "disconnected",
        last_synced: null,
        asset_count: null,
        provider: null,
      }}
      open={showShapefileDialog}
      onOpenChange={setShowShapefileDialog}
      onConnected={() => {
        setShowShapefileDialog(false)
        refreshSources()
      }}
    />
    </>
  )
}
