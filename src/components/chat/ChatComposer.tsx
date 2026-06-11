import * as React from "react"
import {
  AudioLinesIcon,
  BrainCircuitIcon,
  DatabaseIcon,
  FileUpIcon,
  FolderPlusIcon,
  GlobeIcon,
  Loader2,
  MenuIcon,
  MicIcon,
  MonitorIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SendIcon,
  SettingsIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react"

import { Button } from "@/components/ui/Button"
import { ModelSelector } from "@/components/chat/ModelSelector"
import { MentionPicker, type MentionItem } from "@/components/chat/MentionPicker"
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
import { cn } from "@/lib/utils"

export type ChatComposerProps = {
  value: string
  onValueChange: (value: string) => void
  activeProvider: { provider: string; model: string; endpoint: string } | null
  error: string | null
  pending: boolean
  onSubmit: (content: string) => void
  onToggleContext: () => void
  contextActive: boolean
  webSearchEnabled: boolean
  onToggleWebSearch: () => void
  onMentionSelect?: (item: MentionItem) => void
}

type MentionToken = {
  id: string
  type: "connector" | "collection" | "document"
  label: string
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
}: ChatComposerProps) {
  const [showMentionPicker, setShowMentionPicker] = React.useState(false)
  const [mentionQuery, setMentionQuery] = React.useState("")
  const [mentionTokens, setMentionTokens] = React.useState<MentionToken[]>([])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const clean = value.trim()
    if (!clean || pending) return

    let finalContent = clean
    for (const token of mentionTokens) {
      finalContent = finalContent.replace(
        `@${token.label}`,
        `@[${token.label}](connector:${token.id})`
      )
    }

    onValueChange("")
    setMentionTokens([])
    onSubmit(finalContent)
  }

  const handleComposerChange = (newValue: string) => {
    onValueChange(newValue)

    const cursorMatch = newValue.match(/@(\w*)$/)
    if (cursorMatch) {
      setMentionQuery(cursorMatch[1])
      setShowMentionPicker(true)
    } else {
      setShowMentionPicker(false)
    }
  }

  const handleMentionSelect = (item: MentionItem) => {
    setMentionTokens((prev) => [
      ...prev.filter((t) => t.id !== item.id),
      { id: item.id, type: item.type, label: item.label },
    ])
    setShowMentionPicker(false)

    const newValue = value.replace(/@\w*$/, `@${item.label} `)
    onValueChange(newValue)
    onMentionSelect?.(item)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionPicker) {
      if (event.key === "Escape") {
        setShowMentionPicker(false)
        event.preventDefault()
      }
      return
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl shrink-0 border-t border-border bg-background px-4 py-3 sm:px-5">
      <form
        className="rounded-2xl border border-border/80 bg-card/95 p-2 text-card-foreground shadow-xs"
        onSubmit={handleSubmit}
      >
        <InputGroup className="min-h-12 items-center rounded-xl bg-background/95 py-1">
          <InputGroupAddon className="items-center">
            <ToolMenu
              webSearchEnabled={webSearchEnabled}
              onToggleWebSearch={onToggleWebSearch}
            />
          </InputGroupAddon>
          <InputGroupControl className="relative flex items-center">
            <div className="relative w-full">
              {mentionTokens.length > 0 && (
                <div className="mb-1 flex flex-wrap gap-1">
                  {mentionTokens.map((token) => (
                    <span
                      key={token.id}
                      className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[0.6rem] font-medium text-primary"
                    >
                      @{token.label}
                      <button
                        type="button"
                        onClick={() =>
                          setMentionTokens((prev) =>
                            prev.filter((t) => t.id !== token.id)
                          )
                        }
                        className="hover:text-destructive"
                      >
                        <XIcon className="size-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <Textarea
                rows={1}
                value={value}
                autoComplete="off"
                className="max-h-28 min-h-8 border-0 bg-transparent px-1 py-1.5 text-base leading-5 shadow-none focus-visible:ring-0 md:text-sm"
                placeholder="Pregunta lo que quieras (usa @ para mencionar conectores)"
                onChange={(event) => handleComposerChange(event.target.value)}
                onKeyDown={handleKeyDown}
              />
              {showMentionPicker && (
                <MentionPicker
                  query={mentionQuery}
                  onSelect={handleMentionSelect}
                  onClose={() => setShowMentionPicker(false)}
                />
              )}
            </div>
          </InputGroupControl>
          <InputGroupAddon className="items-center">
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Grabar audio">
              <MicIcon className="size-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Modo voz">
              <AudioLinesIcon className="size-4" />
            </Button>
            <ModelSelector>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="rounded-xl"
                aria-label="Modelos y proveedores"
              >
                <MenuIcon className="size-5" />
              </Button>
            </ModelSelector>
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
}: {
  webSearchEnabled: boolean
  onToggleWebSearch: () => void
}) {
  return (
    <DropdownMenu>
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
        className="w-72 rounded-xl p-2"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel>Proyecto</DropdownMenuLabel>
          <DropdownMenuItem className="min-h-8 gap-2 px-2.5 py-1.5">
            <FolderPlusIcon className="size-3.5 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">Agregar proyecto</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="min-h-8 gap-2 px-2.5 py-1.5">
            <SettingsIcon className="size-3.5 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">Configurar proyecto</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Entrada</DropdownMenuLabel>
          <DropdownMenuItem className="min-h-8 gap-2 px-2.5 py-1.5">
            <FileUpIcon className="size-3.5 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">
              Agregar fotos y archivos
            </span>
            <DropdownMenuShortcut className="ml-2 rounded-md bg-muted px-1.5 py-0.5 text-[0.65rem] font-medium tracking-normal text-muted-foreground">
              PDF/DXF
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem className="min-h-8 gap-2 px-2.5 py-1.5">
            <MonitorIcon className="size-3.5 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">Controlar este PC</span>
            <DropdownMenuShortcut className="ml-2 rounded-md bg-muted px-1.5 py-0.5 text-[0.65rem] font-medium tracking-normal text-muted-foreground">
              LOCAL
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Herramientas GIS</DropdownMenuLabel>
          <DropdownMenuItem className="gap-3 px-3 py-2">
            <BrainCircuitIcon className="size-4" />
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
              <MoreHorizontalIcon className="size-4" />
              Mas
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-56 rounded-xl p-2">
              <DropdownMenuItem>Consultar norma POT</DropdownMenuItem>
              <DropdownMenuItem>Ejecutar buffer</DropdownMenuItem>
              <DropdownMenuItem>Exportar analisis</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="gap-3 px-3 py-2">
            <DatabaseIcon className="size-4" />
            Proyectos
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
