import {
  BrainCircuitIcon,
  DatabaseIcon,
  FileTextIcon,
  GlobeIcon,
  InfoIcon,
  Layers3Icon,
  LinkIcon,
  MapPinnedIcon,
  MessageSquareTextIcon,
  NetworkIcon,
  SearchIcon,
  SparklesIcon,
  UploadIcon,
} from "lucide-react"
import { Button } from "@/components/ui/Button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import type { GraphEdge, GraphNode, GraphNodeType } from "@/types/data"

export function nodeIcon(type: GraphNodeType) {
  return {
    norma: FileTextIcon,
    documento: DatabaseIcon,
    capa: Layers3Icon,
    zona: MapPinnedIcon,
    concepto: SparklesIcon,
    chat_turn: MessageSquareTextIcon,
    web_search: GlobeIcon,
    upload: UploadIcon,
    connector: LinkIcon,
    rag_recall: BrainCircuitIcon,
  }[type]
}

export function nodeTypeLabel(type: GraphNodeType) {
  return {
    norma: "Norma",
    documento: "Documento",
    capa: "Capa GIS",
    zona: "Zona territorial",
    concepto: "Concepto técnico",
    chat_turn: "Chat",
    web_search: "Búsqueda web",
    upload: "Subida",
    connector: "Conector",
    rag_recall: "Recuperación RAG",
  }[type]
}

export function nodeBubbleColor(type: GraphNodeType) {
  return {
    norma: "bg-primary",
    documento: "bg-sky-500",
    capa: "bg-emerald-500",
    zona: "bg-orange-500",
    concepto: "bg-violet-500",
    chat_turn: "bg-pink-500",
    web_search: "bg-cyan-500",
    upload: "bg-amber-500",
    connector: "bg-rose-500",
    rag_recall: "bg-indigo-500",
  }[type]
}

export function nodeDotColor(type: GraphNodeType) {
  return nodeBubbleColor(type)
}

export function NodeSheet({
  node,
  relations,
  open,
  onOpenChange,
}: {
  node?: GraphNode
  relations: Array<{ edge: GraphEdge; connectedNode: GraphNode }>
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!node) {
    return <Sheet open={open} onOpenChange={onOpenChange} />
  }

  const Icon = nodeIcon(node.type)
  const relationStrength =
    relations.length > 0
      ? Math.round(
          relations.reduce((total, item) => total + item.edge.strength, 0) /
            relations.length
        )
      : 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[min(96vw,40rem)] gap-0 border-border bg-card/95 p-0 text-card-foreground shadow-[0_18px_70px_rgba(15,23,42,0.22)] backdrop-blur-xl sm:max-w-[40rem]">
        <div className="h-0.5 bg-[linear-gradient(90deg,var(--primary),transparent)]" />
        <SheetHeader className="border-b border-border px-4 pb-3 pt-4">
          <div className="flex items-start gap-3 pr-8">
            <div
              className={cn(
                "relative flex size-10 shrink-0 items-center justify-center rounded-full text-white shadow-sm ring-4 ring-primary/10",
                nodeBubbleColor(node.type)
              )}
            >
              <span className="absolute inset-[-0.45rem] rounded-full border border-current/15" />
              <Icon className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <SheetTitle className="text-base">{node.label}</SheetTitle>
                <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[0.68rem] font-medium text-primary">
                  {nodeTypeLabel(node.type)}
                </span>
              </div>
              <SheetDescription className="mt-1 leading-5">
                {node.source_event === "chat" && "Nodo creado desde un mensaje de chat."}
                {node.source_event === "upload" && "Nodo creado desde un documento indexado."}
                {node.source_event === "sync" && "Nodo creado desde una sincronización."}
                {node.source_event === "rag" && "Nodo creado desde una recuperación RAG."}
                {!node.source_event && "Nodo guardado en el grafo de conocimiento."}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="grid gap-3 overflow-auto p-4 [scrollbar-width:thin]">
          <div className="grid grid-cols-3 gap-2">
            <NodeMetric label="Peso" value={String(node.weight)} />
            <NodeMetric label="Relaciones" value={String(relations.length)} />
            <NodeMetric label="Confianza" value={`${relationStrength}%`} />
          </div>

          {node.source_event && (
            <section className="rounded-lg border border-border bg-background/75 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <InfoIcon className="size-4 text-primary" />
                Origen del evento
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                <span className="font-medium text-foreground">Evento: </span>
                {node.source_event}
              </p>
              {node.event_id && (
                <p className="text-xs leading-5 text-muted-foreground">
                  <span className="font-medium text-foreground">ID: </span>
                  {node.event_id}
                </p>
              )}
              {node.is_ephemeral && (
                <p className="mt-1 text-xs text-amber-500">
                  Este nodo es efímero y se limpiará automáticamente.
                </p>
              )}
            </section>
          )}

          <section className="rounded-lg border border-border bg-background/75 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <InfoIcon className="size-4 text-primary" />
              Información almacenada
            </div>
            <p className="text-sm leading-5 text-muted-foreground">
              {node.description}
            </p>
            <div className="mt-3 rounded-md border border-border bg-card/70 px-2.5 py-2 text-xs text-muted-foreground">
              <span className="block font-medium text-foreground">
                Evidencia
              </span>
              <span className="mt-0.5 block truncate">{node.evidence}</span>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-background/75 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <NetworkIcon className="size-4 text-primary" />
                Relaciones del punto
              </div>
              <span className="text-xs text-muted-foreground">
                {relations.length} activas
              </span>
            </div>
            <div className="grid gap-2">
              {relations.map(({ edge, connectedNode }) => (
                <article
                  key={`${edge.source}-${edge.target}`}
                  className="rounded-md border border-border bg-card/70 p-2.5 transition-colors hover:border-primary/30"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={cn(
                          "size-2.5 shrink-0 rounded-full",
                          nodeDotColor(connectedNode.type)
                        )}
                      />
                      <p className="truncate text-sm font-medium">
                        {connectedNode.label}
                      </p>
                    </div>
                    <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[0.68rem] font-medium text-primary">
                      {edge.strength}%
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {node.label} <span className="text-foreground">{edge.relation}</span>{" "}
                    {connectedNode.label}
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${edge.strength}%` }}
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>

          {node.source_event === "web_search" && (
            <section className="rounded-lg border border-primary/20 bg-primary/10 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <GlobeIcon className="size-4" />
                Fuente web
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground break-all">
                {node.evidence}
              </p>
            </section>
          )}

          {node.source_event === "chat" && (
            <section className="rounded-lg border border-primary/20 bg-primary/10 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <SparklesIcon className="size-4" />
                Contexto de chat
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Este nodo se generó desde una conversación. Se marca como efímero.
              </p>
            </section>
          )}

          {!node.source_event && (
            <section className="rounded-lg border border-primary/20 bg-primary/10 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <SparklesIcon className="size-4" />
                Contexto para IA
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Este nodo puede alimentar respuestas citadas, cruces GIS y memoria semántica.
              </p>
            </section>
          )}
        </div>

        <SheetFooter className="border-t border-border bg-card/95 p-3">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" asChild>
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(node.evidence)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <SearchIcon className="size-4" />
                Ver fuente
              </a>
            </Button>
            <Button size="sm">
              <BrainCircuitIcon className="size-4" />
              Usar en IA
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function NodeMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/75 px-2.5 py-2">
      <p className="text-[0.68rem] leading-4 text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold leading-5">{value}</p>
    </div>
  )
}
