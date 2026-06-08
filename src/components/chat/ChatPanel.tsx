import * as React from "react"
import {
  AudioLinesIcon,
  BrainCircuitIcon,
  DatabaseIcon,
  FileUpIcon,
  GlobeIcon,
  MenuIcon,
  MicIcon,
  MonitorIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  SendIcon,
  SparklesIcon,
} from "lucide-react"

import { GeoNexusIcon } from "@/components/brand/GeoNexusIcon"
import { Button } from "@/components/ui/Button"
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupControl,
} from "@/components/ui/input-group"
import { Textarea } from "@/components/ui/Textarea"
import { ChatTranscript } from "@/components/chat/ChatTranscript"
import { useChatSession } from "@/components/chat/useChatSession"
import {
  type AiConnector,
} from "@/features/workspace/workspace-data"

type ChatPanelProps = {
  models: AiConnector[]
}

export function ChatPanel({ models }: ChatPanelProps) {
  const { activeProvider, error, messages, pending, submit } = useChatSession(models)

  return (
    <section className="relative z-10 mx-auto flex h-[calc(100svh-3.5rem)] w-full max-w-6xl flex-col px-4 sm:px-5">
      <div className="min-h-0 flex-1 overflow-auto pb-36 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {messages.length > 0 || pending ? (
          <ChatTranscript messages={messages} pending={pending} />
        ) : (
          <EmptyChatState />
        )}
      </div>

      <ChatComposer
        activeProvider={activeProvider}
        error={error}
        models={models}
        pending={pending}
        onSubmit={submit}
      />
    </section>
  )
}

function EmptyChatState() {
  return (
    <div className="flex min-h-full items-center justify-center pb-16 pt-10">
      <div className="w-full max-w-3xl text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <GeoNexusIcon className="size-6" variant="nexus" />
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          GeoNexus IA
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Consulta normas POT, analiza capas GIS, sube archivos o graba una
          nota de campo. El resultado aparece aqui cuando empieces a escribir.
        </p>
      </div>
    </div>
  )
}

function ChatComposer({
  activeProvider,
  error,
  models,
  pending,
  onSubmit,
}: {
  activeProvider: { provider: string; model: string; endpoint: string }
  error: string | null
  models: AiConnector[]
  pending: boolean
  onSubmit: (content: string) => void
}) {
  const [value, setValue] = React.useState("")

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const clean = value.trim()
    if (!clean || pending) return
    setValue("")
    onSubmit(clean)
  }

  return (
    <div className="pointer-events-none absolute inset-x-4 bottom-4 mx-auto max-w-3xl sm:inset-x-5 sm:bottom-5">
      <form
        className="pointer-events-auto rounded-2xl border border-border/80 bg-card/95 p-2 text-card-foreground shadow-[0_18px_60px_rgba(15,23,42,0.14)] backdrop-blur-xl"
        onSubmit={handleSubmit}
      >
        <InputGroup className="min-h-12 items-center rounded-xl bg-background/95 py-1">
          <InputGroupAddon className="items-center">
            <ToolMenu />
          </InputGroupAddon>
          <InputGroupControl className="flex items-center">
            <Textarea
              rows={1}
              value={value}
              className="max-h-28 min-h-8 border-0 bg-transparent px-1 py-1.5 text-base leading-5 shadow-none focus-visible:ring-0 md:text-sm"
              placeholder="Pregunta lo que quieras"
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault()
                  event.currentTarget.form?.requestSubmit()
                }
              }}
            />
          </InputGroupControl>
          <InputGroupAddon className="items-center">
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Grabar audio">
              <MicIcon className="size-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Modo voz">
              <AudioLinesIcon className="size-4" />
            </Button>
            <ModelMenu models={models} />
            <Button
              type="submit"
              size="icon"
              className="rounded-xl"
              aria-label="Enviar mensaje"
              disabled={pending || !value.trim()}
            >
              <SendIcon className="size-4" />
            </Button>
          </InputGroupAddon>
        </InputGroup>

        <div className="mt-2 flex flex-wrap gap-1.5 px-2">
          <Button type="button" variant="outline" size="sm">
            <SparklesIcon className="size-4" />
            Usar contexto GIS
          </Button>
          <span className="inline-flex min-h-8 items-center rounded-md bg-muted px-2 text-xs text-muted-foreground">
            {activeProvider.provider} / {activeProvider.model}
          </span>
        </div>

        {error ? (
          <p className="mt-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  )
}

function ToolMenu() {
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
          <DropdownMenuItem className="gap-3 px-3 py-2">
            <GlobeIcon className="size-4" />
            Buscar informacion
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

function ModelMenu({ models }: { models: AiConnector[] }) {
  const activeModel = models[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Modelos y conexiones"
        >
          <MenuIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="top"
        sideOffset={10}
        className="w-64 rounded-xl p-2"
      >
        <DropdownMenuLabel>Modelo activo</DropdownMenuLabel>
        {activeModel ? (
          <DropdownMenuItem className="gap-3 px-3 py-2">
            <GeoNexusIcon className="size-4" variant="agent" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate font-medium">{activeModel.name}</span>
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-[0.68rem] text-muted-foreground">
                  {activeModel.provider}
                </span>
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {activeModel.model}
              </span>
            </span>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem disabled className="gap-3 px-3 py-2">
            <GeoNexusIcon className="size-4" variant="agent" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">
                Sin modelo configurado
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                Conecta un proveedor para habilitar el chat
              </span>
            </span>
          </DropdownMenuItem>
        )}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-3 px-3 py-2">
            <GeoNexusIcon className="size-4" variant="agent" />
            Cambiar modelo
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-60 rounded-xl p-2">
            {models.length ? (
              models.map((connector) => (
                <DropdownMenuItem key={connector.id} className="gap-3">
                  <GeoNexusIcon className="size-4" variant="agent" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {connector.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {connector.model}
                    </span>
                  </span>
                </DropdownMenuItem>
              ))
            ) : (
              <DropdownMenuItem disabled className="gap-3">
                <GeoNexusIcon className="size-4" variant="agent" />
                No hay modelos conectados
              </DropdownMenuItem>
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="gap-3 px-3 py-2">
          <a href="#contenedores-ia-nuevo">
            <PlusIcon className="size-4" />
            Agregar modelo
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="gap-3 px-3 py-2">
          <a href="#contenedores-ia-api">
            <PencilIcon className="size-4" />
            Conectar proveedor
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
