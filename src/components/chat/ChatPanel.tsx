import {
  AudioLinesIcon,
  BrainCircuitIcon,
  CheckCircle2Icon,
  DatabaseIcon,
  FileUpIcon,
  GlobeIcon,
  MenuIcon,
  MicIcon,
  MonitorIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  RadarIcon,
  SendIcon,
  SparklesIcon,
} from "lucide-react"

import { GeoNexusIcon } from "@/components/brand/GeoNexusIcon"
import { AssistantMessage, MessageBubble } from "@/components/chat/MessageBubble"
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
import {
  aiConnectors,
  recentAnalyses,
  type AiConnector,
} from "@/features/workspace/workspace-data"

type ChatPanelProps = {
  models: AiConnector[]
}

const promptExamples = [
  {
    label: "Restricciones de suelo",
    prompt: "Analiza la zona seleccionada y marca alertas POT",
  },
  {
    label: "Resumen documental",
    prompt: "Extrae normas clave de un documento POT",
  },
  {
    label: "Buffer espacial",
    prompt: "Calcula un radio de 300m y cruza capas cercanas",
  },
]

export function ChatPanel({ models }: ChatPanelProps) {
  const hasConversation = false

  return (
    <section className="relative z-10 mx-auto flex h-[calc(100svh-3.5rem)] w-full max-w-6xl flex-col px-4 sm:px-5">
      <div className="min-h-0 flex-1 overflow-auto pb-36 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {hasConversation ? (
          <ConversationPreview />
        ) : (
          <EmptyChatState />
        )}
      </div>

      <ChatComposer models={models} />
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
        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          {promptExamples.map((item) => (
            <button
              key={item.label}
              type="button"
              className="group rounded-lg border border-border/80 bg-card/70 p-3 text-left shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-card hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
            >
              <span className="flex items-center gap-2 text-xs font-medium text-primary">
                <span className="flex size-6 items-center justify-center rounded-md bg-primary/10">
                  <RadarIcon className="size-3.5" />
                </span>
                {item.label}
              </span>
              <span className="mt-2 block text-sm leading-5 text-muted-foreground group-hover:text-foreground">
                {item.prompt}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function ConversationPreview() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 py-6">
      <MessageBubble role="user" eyebrow="Tu">
        <p className="font-medium">
          Cuales son las restricciones de uso de suelo en la zona norte del
          sector industrial?
        </p>
      </MessageBubble>
      <AssistantMessage
        title="GeoNexus IA"
        summary="Analizando capas de zonificacion del POT 2024 para la zona norte..."
        findings={[
          {
            title: "Normativa industrial",
            text: "Permitido tipo II bajo impacto. Prohibido tipo III pesada.",
          },
          {
            title: "Alturas maximas",
            text: "Limite de 15 metros para estructuras operativas.",
          },
        ]}
        warning={{
          title: "Proteccion hidrica",
          text: "Franja de retiro obligatoria de 30 metros respecto al canal principal.",
        }}
        toolCall={`qgis.query_layer(id="zonas_norte", filter="uso_suelo='industrial'")`}
      />
    </div>
  )
}

function ChatComposer({ models }: { models: typeof aiConnectors }) {
  return (
    <div className="pointer-events-none absolute inset-x-4 bottom-4 mx-auto max-w-3xl sm:inset-x-5 sm:bottom-5">
      <div className="pointer-events-auto rounded-2xl border border-border/80 bg-card/95 p-2 text-card-foreground shadow-[0_18px_60px_rgba(15,23,42,0.14)] backdrop-blur-xl">
        <InputGroup className="min-h-12 items-center rounded-xl bg-background/95 py-1">
          <InputGroupAddon className="items-center">
            <ToolMenu />
          </InputGroupAddon>
          <InputGroupControl className="flex items-center">
            <Textarea
              rows={1}
              className="max-h-28 min-h-8 border-0 bg-transparent px-1 py-1.5 text-base leading-5 shadow-none focus-visible:ring-0 md:text-sm"
              placeholder="Pregunta lo que quieras"
            />
          </InputGroupControl>
          <InputGroupAddon className="items-center">
            <Button variant="ghost" size="icon-sm" aria-label="Grabar audio">
              <MicIcon className="size-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Modo voz">
              <AudioLinesIcon className="size-4" />
            </Button>
            <ModelMenu models={models} />
            <Button
              size="icon"
              className="rounded-xl"
              aria-label="Enviar mensaje"
            >
              <SendIcon className="size-4" />
            </Button>
          </InputGroupAddon>
        </InputGroup>

        <div className="mt-2 flex flex-wrap gap-1.5 px-2">
          <Button variant="outline" size="sm">
            <SparklesIcon className="size-4" />
            Usar contexto GIS
          </Button>
          {recentAnalyses.slice(0, 2).map((item) => (
            <span
              key={item.traceId}
              className="inline-flex h-7 items-center rounded-md border border-border bg-background px-2 text-xs text-muted-foreground"
            >
              {item.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function ToolMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
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

function ModelMenu({ models }: { models: typeof aiConnectors }) {
  const activeModel = models[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
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
            <CheckCircle2Icon className="size-4 text-primary" />
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
        ) : null}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-3 px-3 py-2">
            <GeoNexusIcon className="size-4" variant="agent" />
            Cambiar modelo
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-60 rounded-xl p-2">
            {models.map((connector) => (
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
            ))}
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
