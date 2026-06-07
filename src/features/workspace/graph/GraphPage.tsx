import * as React from "react"
import {
  BrainCircuitIcon,
  DatabaseIcon,
  FileTextIcon,
  FilterIcon,
  GitBranchIcon,
  InfoIcon,
  Layers3Icon,
  MapPinnedIcon,
  NetworkIcon,
  RefreshCwIcon,
  SearchIcon,
  SparklesIcon,
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
import {
  graphEdges,
  graphNodes,
  type GraphEdge,
  type GraphNode,
  type GraphNodeType,
} from "@/features/workspace/graph/graph-data"
import { cn } from "@/lib/utils"

type NodePosition = Pick<GraphNode, "x" | "y">

const nodeById = new Map(graphNodes.map((node) => [node.id, node]))
const initialPositions = Object.fromEntries(
  graphNodes.map((node) => [node.id, { x: node.x, y: node.y }])
) as Record<string, NodePosition>

export function GraphPage() {
  const [positions, setPositions] =
    React.useState<Record<string, NodePosition>>(initialPositions)
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null)
  const [draggingNodeId, setDraggingNodeId] = React.useState<string | null>(null)
  const canvasRef = React.useRef<HTMLDivElement | null>(null)
  const dragMovedRef = React.useRef(false)

  const selectedNode = selectedNodeId ? nodeById.get(selectedNodeId) : undefined
  const selectedRelations = selectedNode
    ? getNodeRelations(selectedNode.id)
    : []

  const updateNodePosition = React.useCallback(
    (nodeId: string, event: React.PointerEvent) => {
      const bounds = canvasRef.current?.getBoundingClientRect()

      if (!bounds) return

      const x = ((event.clientX - bounds.left) / bounds.width) * 100
      const y = ((event.clientY - bounds.top) / bounds.height) * 100

      setPositions((current) => ({
        ...current,
        [nodeId]: {
          x: clamp(x, 6, 94),
          y: clamp(y, 8, 92),
        },
      }))
    },
    []
  )

  return (
    <section className="relative z-10 h-[calc(100svh-3.5rem)] overflow-hidden px-3 py-3 sm:px-5 sm:py-4">
      <div className="mx-auto flex size-full max-w-[110rem] flex-col gap-3">
        <GraphHeader />

        <section className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-border/80 bg-card/95 shadow-sm backdrop-blur">
          <GraphToolbar />
          <GraphCanvas
            canvasRef={canvasRef}
            draggingNodeId={draggingNodeId}
            positions={positions}
            selectedNodeId={selectedNodeId}
            onNodePointerDown={(nodeId, event) => {
              dragMovedRef.current = false
              setDraggingNodeId(nodeId)
              event.currentTarget.setPointerCapture(event.pointerId)
            }}
            onNodePointerMove={(nodeId, event) => {
              if (draggingNodeId !== nodeId) return

              dragMovedRef.current = true
              updateNodePosition(nodeId, event)
            }}
            onNodePointerUp={(nodeId, event) => {
              if (draggingNodeId === nodeId && !dragMovedRef.current) {
                setSelectedNodeId(nodeId)
              }

              event.currentTarget.releasePointerCapture(event.pointerId)
              setDraggingNodeId(null)
            }}
          />
          <GraphLegend />
        </section>
      </div>

      <NodeSheet
        node={selectedNode}
        relations={selectedRelations}
        open={Boolean(selectedNode)}
        onOpenChange={(open) => {
          if (!open) setSelectedNodeId(null)
        }}
      />
    </section>
  )
}

function GraphHeader() {
  return (
    <header className="rounded-lg border border-border/80 bg-card/95 p-3 shadow-sm backdrop-blur">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GitBranchIcon className="size-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight">
              Grafo de conocimiento territorial
            </h1>
            <p className="mt-0.5 max-w-4xl text-sm leading-5 text-muted-foreground">
              Mueve los puntos para explorar relaciones entre documentos, normas,
              capas GIS y zonas. Al tocar un nodo veras la informacion que se
              almacena para que la IA tenga contexto trazable.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button size="sm">
            <BrainCircuitIcon className="size-4" />
            Analizar con IA
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCwIcon className="size-4" />
            Recalcular red
          </Button>
        </div>
      </div>
    </header>
  )
}

function GraphToolbar() {
  return (
    <div className="absolute left-3 top-3 z-20 flex flex-wrap gap-2">
      <Button variant="outline" size="sm" className="h-7 bg-card/90">
        <SearchIcon className="size-4" />
        Buscar nodo
      </Button>
      <Button variant="outline" size="sm" className="h-7 bg-card/90">
        <FilterIcon className="size-4" />
        Filtros
      </Button>
      <span className="hidden h-7 items-center rounded-md border border-border bg-card/90 px-2 text-xs text-muted-foreground sm:inline-flex">
        Arrastra un punto o toca para abrir detalle
      </span>
    </div>
  )
}

function GraphCanvas({
  canvasRef,
  draggingNodeId,
  positions,
  selectedNodeId,
  onNodePointerDown,
  onNodePointerMove,
  onNodePointerUp,
}: {
  canvasRef: React.RefObject<HTMLDivElement>
  draggingNodeId: string | null
  positions: Record<string, NodePosition>
  selectedNodeId: string | null
  onNodePointerDown: (nodeId: string, event: React.PointerEvent<HTMLButtonElement>) => void
  onNodePointerMove: (nodeId: string, event: React.PointerEvent<HTMLButtonElement>) => void
  onNodePointerUp: (nodeId: string, event: React.PointerEvent<HTMLButtonElement>) => void
}) {
  return (
    <div
      ref={canvasRef}
      className="relative size-full min-h-[32rem] overflow-hidden bg-background/75"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(148,163,184,0.2)_1px,transparent_1px)] bg-[size:28px_28px]" />
      <div className="absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_50%_45%,color-mix(in_oklch,var(--primary),transparent_84%),transparent_44%)]" />

      <svg
        className="absolute inset-0 size-full"
        viewBox="0 0 100 100"
        role="img"
        aria-label="Red animada de conocimiento territorial"
        preserveAspectRatio="none"
      >
        {graphEdges.map((edge) => {
          const source = positions[edge.source]
          const target = positions[edge.target]
          const active =
            selectedNodeId === edge.source || selectedNodeId === edge.target

          if (!source || !target) return null

          return (
            <g key={`${edge.source}-${edge.target}`}>
              <line
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                className={cn(
                  "stroke-primary/25 transition-all duration-300",
                  active && "stroke-primary/70"
                )}
                strokeWidth={active ? 1.8 : Math.max(0.7, edge.strength / 90)}
                vectorEffect="non-scaling-stroke"
              />
              <circle
                r="0.45"
                className="fill-primary/70"
              >
                <animateMotion
                  dur={`${4.6 + (100 - edge.strength) / 20}s`}
                  repeatCount="indefinite"
                  path={`M ${source.x} ${source.y} L ${target.x} ${target.y}`}
                />
              </circle>
            </g>
          )
        })}
      </svg>

      {graphNodes.map((node) => (
        <GraphNodeBubble
          key={node.id}
          dragging={draggingNodeId === node.id}
          node={node}
          position={positions[node.id]}
          selected={selectedNodeId === node.id}
          onPointerDown={(event) => onNodePointerDown(node.id, event)}
          onPointerMove={(event) => onNodePointerMove(node.id, event)}
          onPointerUp={(event) => onNodePointerUp(node.id, event)}
        />
      ))}
    </div>
  )
}

function GraphNodeBubble({
  dragging,
  node,
  position,
  selected,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  dragging: boolean
  node: GraphNode
  position: NodePosition
  selected: boolean
  onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void
  onPointerMove: (event: React.PointerEvent<HTMLButtonElement>) => void
  onPointerUp: (event: React.PointerEvent<HTMLButtonElement>) => void
}) {
  const size = 3.5 + node.weight * 0.55
  const Icon = nodeIcon(node.type)

  return (
    <button
      type="button"
      className={cn(
        "group absolute flex -translate-x-1/2 -translate-y-1/2 touch-none select-none items-center justify-center rounded-full border border-white/50 text-white shadow-[0_16px_42px_rgba(15,23,42,0.22)] outline-none transition-[box-shadow,transform,border-color] duration-200 focus-visible:ring-3 focus-visible:ring-ring/40",
        nodeBubbleColor(node.type),
        dragging
          ? "z-30 scale-110 cursor-grabbing border-white shadow-[0_22px_70px_rgba(15,23,42,0.32)]"
          : "z-10 cursor-grab hover:scale-105",
        selected && "border-white ring-4 ring-primary/25"
      )}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        width: `${size}rem`,
        height: `${size}rem`,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <span className="absolute inset-[-0.55rem] rounded-full border border-current/20 opacity-0 transition group-hover:opacity-100" />
      <span className="absolute inset-[-1.05rem] rounded-full border border-current/10 opacity-0 transition group-hover:opacity-100" />
      <span className="grid place-items-center gap-0.5 text-center">
        <Icon className="mx-auto size-4" />
        <span className="max-w-20 truncate px-1 text-[0.68rem] font-semibold leading-3">
          {node.label}
        </span>
      </span>
    </button>
  )
}

function GraphLegend() {
  const items: Array<{ label: string; type: GraphNodeType }> = [
    { label: "Norma", type: "norma" },
    { label: "Documento", type: "documento" },
    { label: "Capa GIS", type: "capa" },
    { label: "Zona", type: "zona" },
    { label: "Concepto", type: "concepto" },
  ]

  return (
    <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card/90 p-2 shadow-sm backdrop-blur sm:left-auto sm:w-fit">
      {items.map((item) => (
        <span
          key={item.type}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground"
        >
          <span className={cn("size-2.5 rounded-full", nodeDotColor(item.type))} />
          {item.label}
        </span>
      ))}
    </div>
  )
}

function NodeSheet({
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
      <SheetContent className="w-[min(94vw,28rem)] gap-0 border-border bg-card/95 p-0 text-card-foreground shadow-[0_18px_70px_rgba(15,23,42,0.22)] backdrop-blur-xl sm:max-w-[28rem]">
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
                Nodo guardado en el grafo de conocimiento para memoria, citas y
                razonamiento IA.
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

          <section className="rounded-lg border border-border bg-background/75 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <InfoIcon className="size-4 text-primary" />
              Informacion almacenada
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

          <section className="rounded-lg border border-primary/20 bg-primary/10 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <SparklesIcon className="size-4" />
              Contexto para IA
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Este nodo puede alimentar respuestas citadas, cruces GIS y memoria
              semantica. Cuando conectemos el backend, aqui llegaran entidades,
              chunks, embeddings y relaciones calculadas.
            </p>
          </section>
        </div>

        <SheetFooter className="border-t border-border bg-card/95 p-3">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm">
              <SearchIcon className="size-4" />
              Ver fuente
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

function getNodeRelations(nodeId: string) {
  return graphEdges.flatMap((edge) => {
    if (edge.source !== nodeId && edge.target !== nodeId) return []

    const connectedNodeId = edge.source === nodeId ? edge.target : edge.source
    const connectedNode = nodeById.get(connectedNodeId)

    return connectedNode ? [{ edge, connectedNode }] : []
  })
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function nodeIcon(type: GraphNodeType) {
  return {
    norma: FileTextIcon,
    documento: DatabaseIcon,
    capa: Layers3Icon,
    zona: MapPinnedIcon,
    concepto: SparklesIcon,
  }[type]
}

function nodeTypeLabel(type: GraphNodeType) {
  return {
    norma: "Norma",
    documento: "Documento",
    capa: "Capa GIS",
    zona: "Zona territorial",
    concepto: "Concepto tecnico",
  }[type]
}

function nodeBubbleColor(type: GraphNodeType) {
  return {
    norma: "bg-primary",
    documento: "bg-sky-500",
    capa: "bg-emerald-500",
    zona: "bg-orange-500",
    concepto: "bg-violet-500",
  }[type]
}

function nodeDotColor(type: GraphNodeType) {
  return {
    norma: "bg-primary",
    documento: "bg-sky-500",
    capa: "bg-emerald-500",
    zona: "bg-orange-500",
    concepto: "bg-violet-500",
  }[type]
}
