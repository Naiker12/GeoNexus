import {
  AudioLinesIcon,
  BotIcon,
  BrainCircuitIcon,
  CheckCircle2Icon,
  DatabaseIcon,
  FileUpIcon,
  FolderIcon,
  GlobeIcon,
  ImageIcon,
  MenuIcon,
  MicIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  SendIcon,
  SparklesIcon,
} from "lucide-react"

import { AppTopbar } from "@/components/layout/AppTopbar"
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
} from "@/features/workspace/workspace-data"

const promptExamples = [
  "Analiza restricciones de uso de suelo",
  "Resume un documento POT",
  "Calcula un buffer de 300m",
]

export function GeoNexusWorkspace() {
  const activeConnector = aiConnectors[0]
  const selectableModels = aiConnectors.filter((connector) =>
    ["chat", "embedding"].includes(connector.role)
  )
  const hasConversation = false

  return (
    <div className="flex min-h-svh flex-col">
      <AppTopbar
        connector={activeConnector.name}
        model={activeConnector.model}
        status={activeConnector.status}
      />

      <main className="relative min-h-0 flex-1 overflow-hidden bg-background">
        <MapBackdrop />
        <section className="relative z-10 mx-auto flex h-[calc(100svh-3.5rem)] w-full max-w-6xl flex-col px-5">
          <div className="min-h-0 flex-1 overflow-auto pb-32 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {hasConversation ? (
              <div className="mx-auto w-full max-w-4xl space-y-4 py-6">
                <UserPrompt />
                <AssistantResult />
              </div>
            ) : (
              <EmptyChatState
                activeModel={`${activeConnector.name} / ${activeConnector.model}`}
              />
            )}
          </div>

          <ChatComposer models={selectableModels} />
        </section>
      </main>
    </div>
  )
}

function EmptyChatState({ activeModel }: { activeModel: string }) {
  return (
    <div className="flex min-h-full items-center justify-center pb-16 pt-10">
      <div className="w-full max-w-3xl text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <BotIcon className="size-5" />
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          GeoNexus IA
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Consulta normas POT, analiza capas GIS, sube archivos o graba una
          nota de campo. El resultado aparece aqui cuando empieces a escribir.
        </p>
        <span className="mt-3 inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          {activeModel}
        </span>

        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          {promptExamples.map((prompt) => (
            <button
              key={prompt}
              className="rounded-lg border border-border bg-card/80 p-3 text-left text-sm leading-5 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-card hover:text-foreground"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function UserPrompt() {
  return (
    <article className="ml-auto max-w-2xl rounded-lg border border-border bg-muted/95 p-4 text-sm text-foreground shadow-sm backdrop-blur">
      <p className="text-xs font-medium uppercase tracking-wide text-primary">
        Tu
      </p>
      <p className="mt-2 font-medium leading-6">
        Cuales son las restricciones de uso de suelo en la zona norte del
        sector industrial?
      </p>
    </article>
  )
}

function AssistantResult() {
  return (
    <article className="max-w-3xl rounded-lg border border-border bg-card/95 p-5 text-card-foreground shadow-sm backdrop-blur">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
        <SparklesIcon className="size-4" />
        GeoNexus AI
      </div>
      <p className="mt-3 text-sm font-medium">
        Analizando capas de zonificacion del POT 2024 para la zona norte...
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <FindingCard
          title="Normativa industrial"
          text="Permitido tipo II bajo impacto. Prohibido tipo III pesada."
        />
        <FindingCard
          title="Alturas maximas"
          text="Limite de 15 metros para estructuras operativas."
        />
      </div>

      <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
        <p className="font-medium text-destructive">Proteccion hidrica</p>
        <p className="mt-1 text-muted-foreground">
          Franja de retiro obligatoria de 30 metros respecto al canal principal.
        </p>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-background p-3 font-mono text-xs text-primary">
        qgis.query_layer(id=&quot;zonas_norte&quot;,
        filter=&quot;uso_suelo='industrial'&quot;)
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm">Ejecutar buffer 300m</Button>
        <Button variant="outline" size="sm">
          Ver capas relacionadas
        </Button>
      </div>
    </article>
  )
}

function FindingCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/80 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
        {title}
      </p>
      <p className="mt-2 text-sm leading-5 text-muted-foreground">{text}</p>
    </div>
  )
}

function ChatComposer({ models }: { models: typeof aiConnectors }) {
  return (
    <div className="pointer-events-none absolute inset-x-5 bottom-5 mx-auto max-w-3xl">
      <div className="pointer-events-auto rounded-[1.65rem] border border-border/80 bg-card/95 p-2 text-card-foreground shadow-[0_18px_60px_rgba(15,23,42,0.14)] backdrop-blur-xl">
        <InputGroup className="min-h-12 rounded-[1.35rem] bg-background/95">
          <InputGroupAddon>
            <ToolMenu />
          </InputGroupAddon>
          <InputGroupControl>
            <Textarea
              rows={1}
              className="min-h-9 border-0 bg-transparent px-1 py-2 text-base shadow-none focus-visible:ring-0 md:text-sm"
              placeholder="Pregunta lo que quieras"
            />
          </InputGroupControl>
          <InputGroupAddon>
            <Button variant="ghost" size="icon-sm" aria-label="Grabar audio">
              <MicIcon className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-full"
              aria-label="Modo voz"
            >
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
          className="rounded-full"
          aria-label="Abrir herramientas"
        >
          <PlusIcon className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="top"
        sideOffset={10}
        className="w-72 rounded-2xl p-2"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel>Entrada</DropdownMenuLabel>
          <DropdownMenuItem className="gap-3 px-3 py-2">
            <FileUpIcon className="size-4" />
            Agregar fotos y archivos
            <DropdownMenuShortcut>PDF/DXF</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-3 px-3 py-2">
              <FolderIcon className="size-4" />
              Archivos recientes
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-56 rounded-xl p-2">
              <DropdownMenuItem>POT Barranquilla 2024</DropdownMenuItem>
              <DropdownMenuItem>Zonificacion norte</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Herramientas GIS</DropdownMenuLabel>
          <DropdownMenuItem className="gap-3 px-3 py-2">
            <ImageIcon className="size-4" />
            Crear visualizacion
          </DropdownMenuItem>
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
        className="w-64 rounded-2xl p-2"
      >
        <DropdownMenuLabel>Modelo activo</DropdownMenuLabel>
        {activeModel && (
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
        )}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-3 px-3 py-2">
            <BotIcon className="size-4" />
            Cambiar modelo
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-60 rounded-xl p-2">
            {models.map((connector) => (
              <DropdownMenuItem key={connector.id} className="gap-3">
                <BotIcon className="size-4" />
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
        <DropdownMenuItem className="gap-3 px-3 py-2">
          <PlusIcon className="size-4" />
          Agregar modelo
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-3 px-3 py-2">
          <PencilIcon className="size-4" />
          Conectar proveedor
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function MapBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <LightMapBackdrop />
      <DarkMapBackdrop />
    </div>
  )
}

function LightMapBackdrop() {
  return (
    <div className="absolute inset-0 block [.geo-dark_&]:hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.16)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.14)_1px,transparent_1px)] bg-[size:72px_72px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_46%,rgba(16,185,129,0.12),transparent_24%)]" />
      <svg
        className="absolute inset-0 size-full opacity-80"
        viewBox="0 0 1440 900"
        role="img"
        aria-label="Mapa base claro de referencia"
        preserveAspectRatio="xMidYMid slice"
      >
        <path
          d="M-80 690 C250 672 430 670 640 660 C870 650 1090 642 1520 650"
          fill="none"
          stroke="#bae6fd"
          strokeWidth="26"
          opacity=".42"
        />
        <path
          d="M-90 520 C210 478 390 462 585 430 C810 392 1040 365 1510 330"
          fill="none"
          stroke="#cbd5e1"
          strokeWidth="5"
          opacity=".30"
        />
        <path
          d="M-80 610 C250 575 510 560 745 532 C980 504 1210 488 1510 462"
          fill="none"
          stroke="#cbd5e1"
          strokeWidth="4"
          opacity=".24"
        />
        <path
          d="M260 560 L520 470 L760 448 L1010 478 L900 620 L610 685 L355 670 Z"
          fill="#94a3b8"
          opacity=".13"
        />
        <path
          d="M488 560 h150 a8 8 0 0 1 8 8 v34 a8 8 0 0 1-8 8 h-150 a8 8 0 0 1-8-8 v-34 a8 8 0 0 1 8-8Z"
          fill="#64748b"
          opacity=".13"
        />
        <path
          d="M716 526 h206 a10 10 0 0 1 10 10 v48 a10 10 0 0 1-10 10 h-206 a10 10 0 0 1-10-10 v-48 a10 10 0 0 1 10-10Z"
          fill="#64748b"
          opacity=".15"
        />
        <path
          d="M620 620 h204 a10 10 0 0 1 10 10 v46 a10 10 0 0 1-10 10 h-204 a10 10 0 0 1-10-10 v-46 a10 10 0 0 1 10-10Z"
          fill="#f59e0b"
          opacity=".14"
        />
        <path
          d="M996 586 h178 a10 10 0 0 1 10 10 v54 a10 10 0 0 1-10 10 h-178 a10 10 0 0 1-10-10 v-54 a10 10 0 0 1 10-10Z"
          fill="#64748b"
          opacity=".11"
        />
        <g opacity=".72">
          <circle cx="748" cy="546" r="7" fill="#94a3b8" stroke="#fff" strokeWidth="3" />
          <circle cx="626" cy="628" r="7" fill="#fdba74" stroke="#fff" strokeWidth="3" />
          <circle cx="1180" cy="564" r="7" fill="#7dd3fc" stroke="#fff" strokeWidth="3" />
        </g>
        <text x="1065" y="640" fill="#94a3b8" fontSize="13">
          Rio Magdalena
        </text>
        <text x="720" y="500" fill="#94a3b8" fontSize="12">
          Zona norte
        </text>
      </svg>
      <div className="absolute inset-0 bg-background/38" />
    </div>
  )
}

function DarkMapBackdrop() {
  return (
    <div className="absolute inset-0 hidden [.geo-dark_&]:block">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:72px_72px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_46%,rgba(16,185,129,0.13),transparent_28%)]" />
      <svg
        className="absolute inset-0 size-full opacity-70"
        viewBox="0 0 1440 900"
        role="img"
        aria-label="Mapa base oscuro de referencia"
        preserveAspectRatio="xMidYMid slice"
      >
        <path
          d="M-80 690 C250 672 430 670 640 660 C870 650 1090 642 1520 650"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="24"
          opacity=".10"
        />
        <path
          d="M-90 520 C210 478 390 462 585 430 C810 392 1040 365 1510 330"
          fill="none"
          stroke="#94a3b8"
          strokeWidth="5"
          opacity=".12"
        />
        <path
          d="M-80 610 C250 575 510 560 745 532 C980 504 1210 488 1510 462"
          fill="none"
          stroke="#94a3b8"
          strokeWidth="4"
          opacity=".10"
        />
        <path
          d="M260 560 L520 470 L760 448 L1010 478 L900 620 L610 685 L355 670 Z"
          fill="#34d399"
          opacity=".08"
        />
        <path d="M488 560 h150 a8 8 0 0 1 8 8 v34 a8 8 0 0 1-8 8 h-150 a8 8 0 0 1-8-8 v-34 a8 8 0 0 1 8-8Z" fill="#34d399" opacity=".08" />
        <path d="M716 526 h206 a10 10 0 0 1 10 10 v48 a10 10 0 0 1-10 10 h-206 a10 10 0 0 1-10-10 v-48 a10 10 0 0 1 10-10Z" fill="#34d399" opacity=".10" />
        <path d="M620 620 h204 a10 10 0 0 1 10 10 v46 a10 10 0 0 1-10 10 h-204 a10 10 0 0 1-10-10 v-46 a10 10 0 0 1 10-10Z" fill="#fb923c" opacity=".10" />
        <path d="M996 586 h178 a10 10 0 0 1 10 10 v54 a10 10 0 0 1-10 10 h-178 a10 10 0 0 1-10-10 v-54 a10 10 0 0 1 10-10Z" fill="#34d399" opacity=".08" />
        <circle cx="748" cy="546" r="7" fill="#10b981" stroke="#0b110d" strokeWidth="3" />
        <circle cx="626" cy="628" r="7" fill="#f97316" stroke="#0b110d" strokeWidth="3" />
        <circle cx="1180" cy="564" r="7" fill="#0ea5e9" stroke="#0b110d" strokeWidth="3" />
      </svg>
      <div className="absolute inset-0 bg-background/68" />
    </div>
  )
}
