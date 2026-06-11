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
  XIcon,
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
import { listGraphNodes, listGraphEdges, rebuildKnowledgeGraph, updateNodePosition } from "@/api/data"
import type { GraphEdge, GraphNode, GraphNodeType } from "@/types/data"
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, forceX, forceY } from "d3-force"

type NodePosition = { x: number; y: number }
type KindFilter = "all" | GraphNodeType

export function GraphPage() {
  const [nodes, setNodes] = React.useState<GraphNode[]>([])
  const [edges, setEdges] = React.useState<GraphEdge[]>([])
  const [loading, setLoading] = React.useState(true)
  const [rebuilding, setRebuilding] = React.useState(false)
  const [positions, setPositions] = React.useState<Record<string, NodePosition>>({})
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null)
  const [draggingNodeId, setDraggingNodeId] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [kindFilter, setKindFilter] = React.useState<KindFilter>("all")
  const canvasRef = React.useRef<HTMLDivElement | null>(null)
  const dragMovedRef = React.useRef(false)
  const dragEndTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const nodesRef = React.useRef(nodes)
  const positionsRef = React.useRef(positions)

  nodesRef.current = nodes
  positionsRef.current = positions

  const loadGraphData = React.useCallback(async () => {
    try {
      const dbNodes = await listGraphNodes()
      const dbEdges = await listGraphEdges()
      setNodes(dbNodes)
      setEdges(dbEdges)

      const initialPositions: Record<string, NodePosition> = {}
      dbNodes.forEach((node) => {
        initialPositions[node.id] = { x: node.x, y: node.y }
      })
      setPositions(initialPositions)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadGraphData()
  }, [loadGraphData])

  // Force-directed layout animado con d3-force
  React.useEffect(() => {
    if (nodes.length === 0) return

    const depthMap: Record<string, number> = {}
    function assignDepth(nodeId: string, depth: number) {
      if (depthMap[nodeId] !== undefined && depthMap[nodeId] <= depth) return
      depthMap[nodeId] = depth
      for (const e of edges) {
        if (e.source === nodeId) assignDepth(e.target, depth + 1)
        if (e.target === nodeId) assignDepth(e.source, depth + 1)
      }
    }
    for (const n of nodes) {
      const hasParent = edges.some((e) => e.target === n.id || e.source === n.id)
      if (!hasParent) assignDepth(n.id, 0)
    }
    for (const n of nodes) {
      if (depthMap[n.id] === undefined) assignDepth(n.id, 0)
    }

    const maxDepth = Math.max(...Object.values(depthMap), 1)

    const simNodes: Array<{ id: string; x: number; y: number }> = nodes.map((n) => ({
      id: n.id,
      x: n.x,
      y: n.y,
    }))
    const simLinks: Array<{ source: string; target: string; strength: number }> = edges.map((e) => ({
      source: e.source,
      target: e.target,
      strength: e.strength / 100,
    }))

    const simulation = forceSimulation(simNodes)
      .force(
        "link",
        forceLink(simLinks)
          .id((d: any) => d.id)
          .distance((l: any) => 10 + (1 - l.strength) * 30)
          .strength(0.6),
      )
      .force("charge", forceManyBody().strength(-120))
      .force("center", forceCenter(50, 50))
      .force("collision", forceCollide(18))
      .force(
        "y",
        forceY((d: any) => 10 + (depthMap[d.id] / Math.max(maxDepth, 1)) * 75).strength(0.4),
      )
      .force(
        "x",
        forceX(50).strength(0.08),
      )
      .alpha(1)
      .alphaDecay(0.04)
      .velocityDecay(0.35)
      .on("tick", () => {
        const newPositions: Record<string, NodePosition> = {}
        simulation.nodes().forEach((n: any) => {
          newPositions[n.id] = {
            x: clamp(n.x, 5, 95),
            y: clamp(n.y, 5, 95),
          }
        })
        setPositions((prev) => ({ ...prev, ...newPositions }))
      })

    return () => { simulation.stop() }
  }, [nodes.length, edges.length])

  const handleRebuild = async () => {
    setRebuilding(true)
    try {
      await rebuildKnowledgeGraph()
      await loadGraphData()
    } catch (e) {
      console.error("Error al recalcular red:", e)
    } finally {
      setRebuilding(false)
    }
  }

  const filteredNodes = React.useMemo(() => {
    let result = nodes
    if (kindFilter !== "all") {
      result = result.filter((n) => n.type === kindFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((n) => n.label.toLowerCase().includes(q))
    }
    return result
  }, [nodes, kindFilter, searchQuery])

  const filteredEdgeIds = React.useMemo(() => {
    const visibleIds = new Set(filteredNodes.map((n) => n.id))
    return new Set(
      edges
        .filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
        .map((e) => `${e.source}-${e.target}`),
    )
  }, [filteredNodes, edges])

  const nodeById = React.useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes])
  const selectedNode = selectedNodeId ? nodeById.get(selectedNodeId) : undefined

  const selectedRelations = React.useMemo(() => {
    if (!selectedNode) return []
    return edges.flatMap((edge) => {
      if (edge.source !== selectedNode.id && edge.target !== selectedNode.id) return []

      const connectedNodeId = edge.source === selectedNode.id ? edge.target : edge.source
      const connectedNode = nodeById.get(connectedNodeId)

      return connectedNode ? [{ edge, connectedNode }] : []
    })
  }, [selectedNode, edges, nodeById])

  const handlePointerMove = React.useCallback(
    (nodeId: string, event: React.PointerEvent) => {
      if (draggingNodeId !== nodeId) return
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
    [draggingNodeId],
  )

  const handlePointerUp = React.useCallback(
    (nodeId: string, event: React.PointerEvent) => {
      if (draggingNodeId === nodeId && !dragMovedRef.current) {
        setSelectedNodeId(nodeId)
      }

      event.currentTarget.releasePointerCapture(event.pointerId)
      setDraggingNodeId(null)

      // Debounce: guardar posición 500ms después de soltar
      if (dragEndTimer.current) clearTimeout(dragEndTimer.current)
      dragEndTimer.current = setTimeout(() => {
        const p = positionsRef.current[nodeId]
        if (p) {
          updateNodePosition(nodeId, p.x, p.y).catch(console.error)
        }
      }, 500)
    },
    [draggingNodeId],
  )

  const hasGraphData = nodes.length > 0

  return (
    <section className="relative z-10 h-[calc(100svh-3.5rem)] overflow-hidden px-3 py-3 sm:px-5 sm:py-4">
      <div className="mx-auto flex size-full max-w-[110rem] flex-col gap-3">
        <GraphHeader onRebuild={handleRebuild} rebuilding={rebuilding} />

        <section className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-border/80 bg-card/95 shadow-sm backdrop-blur">
          <GraphToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            kindFilter={kindFilter}
            onKindFilterChange={setKindFilter}
          />
          {loading ? (
            <div className="flex size-full items-center justify-center gap-2 text-sm text-muted-foreground bg-background/75">
              <RefreshCwIcon className="size-4 animate-spin" />
              Cargando base de conocimiento...
            </div>
          ) : !hasGraphData ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <BrainCircuitIcon className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                No hay nodos de conocimiento aún.
              </p>
              <p className="text-xs text-muted-foreground/60">
                Indexa un documento para poblar la red.
              </p>
              <Button variant="outline" size="sm" onClick={handleRebuild} disabled={rebuilding}>
                <RefreshCwIcon className={cn("size-4", rebuilding && "animate-spin")} />
                Recalcular red
              </Button>
            </div>
          ) : (
            <GraphCanvas
              canvasRef={canvasRef}
              draggingNodeId={draggingNodeId}
              positions={positions}
              selectedNodeId={selectedNodeId}
              nodes={filteredNodes}
              edges={edges}
              filteredEdgeIds={filteredEdgeIds}
              onNodePointerDown={(nodeId, event) => {
                dragMovedRef.current = false
                setDraggingNodeId(nodeId)
                event.currentTarget.setPointerCapture(event.pointerId)
              }}
              onNodePointerMove={handlePointerMove}
              onNodePointerUp={handlePointerUp}
            />
          )}
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

function GraphHeader({ onRebuild, rebuilding }: { onRebuild: () => void; rebuilding: boolean }) {
  return (
    <header className="rounded-lg border border-border/80 bg-card/95 p-3 shadow-sm backdrop-blur">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GitBranchIcon className="size-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight">
              Base de conocimiento
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
          <Button variant="outline" size="sm" onClick={onRebuild} disabled={rebuilding}>
            <RefreshCwIcon className={cn("size-4", rebuilding && "animate-spin")} />
            {rebuilding ? "Recalculando..." : "Recalcular red"}
          </Button>
        </div>
      </div>
    </header>
  )
}

const KIND_OPTIONS: Array<{ value: KindFilter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "norma", label: "Norma" },
  { value: "documento", label: "Documento" },
  { value: "capa", label: "Capa GIS" },
  { value: "zona", label: "Zona" },
  { value: "concepto", label: "Concepto" },
]

function GraphToolbar({
  searchQuery,
  onSearchChange,
  kindFilter,
  onKindFilterChange,
}: {
  searchQuery: string
  onSearchChange: (q: string) => void
  kindFilter: KindFilter
  onKindFilterChange: (f: KindFilter) => void
}) {
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [filterOpen, setFilterOpen] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement | null>(null)

  React.useEffect(() => {
    if (searchOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [searchOpen])

  return (
    <div className="absolute left-3 top-3 z-20 flex flex-wrap gap-2">
      {searchOpen ? (
        <div className="flex h-7 items-center gap-1 rounded-md border border-border bg-card/90 px-1.5 text-xs">
          <SearchIcon className="size-3.5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar nodo..."
            className="w-32 bg-transparent text-xs outline-none placeholder:text-muted-foreground/50"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                onSearchChange("")
                setSearchOpen(false)
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <XIcon className="size-3" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              onSearchChange("")
              setSearchOpen(false)
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            <XIcon className="size-3.5" />
          </button>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="h-7 bg-card/90" onClick={() => setSearchOpen(true)}>
          <SearchIcon className="size-4" />
          Buscar nodo
        </Button>
      )}

      {filterOpen ? (
        <div className="flex h-7 items-center gap-0.5 rounded-md border border-border bg-card/90 px-1 text-xs">
          {KIND_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onKindFilterChange(opt.value)
                setFilterOpen(false)
              }}
              className={`rounded px-1.5 py-0.5 transition-colors ${
                kindFilter === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setFilterOpen(false)}
            className="ml-1 text-muted-foreground hover:text-foreground"
          >
            <XIcon className="size-3" />
          </button>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="h-7 bg-card/90" onClick={() => setFilterOpen(true)}>
          <FilterIcon className="size-4" />
          {kindFilter === "all" ? "Filtros" : KIND_OPTIONS.find((o) => o.value === kindFilter)?.label}
        </Button>
      )}

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
  nodes,
  edges,
  filteredEdgeIds,
}: {
  canvasRef: React.RefObject<HTMLDivElement>
  draggingNodeId: string | null
  positions: Record<string, NodePosition>
  selectedNodeId: string | null
  onNodePointerDown: (nodeId: string, event: React.PointerEvent<HTMLButtonElement>) => void
  onNodePointerMove: (nodeId: string, event: React.PointerEvent<HTMLButtonElement>) => void
  onNodePointerUp: (nodeId: string, event: React.PointerEvent<HTMLButtonElement>) => void
  nodes: GraphNode[]
  edges: GraphEdge[]
  filteredEdgeIds: Set<string>
}) {
  return (
    <div
      ref={canvasRef}
      className="relative size-full min-h-[32rem] overflow-hidden bg-background/75"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(148,163,184,0.2)_1px,transparent_1px)] bg-[size:28px_28px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,color-mix(in_oklch,var(--primary),transparent_84%),transparent_44%)]" />

      <svg
        className="absolute inset-0 size-full"
        viewBox="0 0 100 100"
        role="img"
        aria-label="Red animada de conocimiento territorial"
        preserveAspectRatio="none"
      >
        {edges.filter((e) => filteredEdgeIds.has(`${e.source}-${e.target}`)).map((edge) => {
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
                  active && "stroke-primary/60"
                )}
                strokeWidth={active ? 1.2 : Math.max(0.4, edge.strength / 140)}
                strokeDasharray={active ? "1.2,1.8" : "0.8,2.2"}
                vectorEffect="non-scaling-stroke"
              />
              <circle r="0.3" className="fill-primary/60">
                <animateMotion
                  dur={`${3 + (1 - edge.strength / 100) * 4}s`}
                  repeatCount="indefinite"
                  path={`M ${source.x} ${source.y} L ${target.x} ${target.y}`}
                />
              </circle>
            </g>
          )
        })}
      </svg>

      {nodes.map((node) => {
        const pos = positions[node.id]
        if (!pos) return null
        return (
          <GraphNodeBubble
            key={node.id}
            dragging={draggingNodeId === node.id}
            node={node}
            position={pos}
            selected={selectedNodeId === node.id}
            onPointerDown={(event) => onNodePointerDown(node.id, event)}
            onPointerMove={(event) => onNodePointerMove(node.id, event)}
            onPointerUp={(event) => onNodePointerUp(node.id, event)}
          />
        )
      })}
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
  const r = 2.2 + node.weight * 0.4
  const Icon = nodeIcon(node.type)

  return (
    <div
      className="group absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
    >
      <button
        type="button"
        className={cn(
          "relative z-10 block touch-none select-none rounded-full border-2 text-white shadow-[0_8px_24px_rgba(15,23,42,0.2)] outline-none transition-[box-shadow,transform,border-color] duration-200 focus-visible:ring-3 focus-visible:ring-ring/40",
          nodeBubbleColor(node.type),
          dragging
            ? "scale-110 cursor-grabbing border-white shadow-[0_12px_40px_rgba(15,23,42,0.32)]"
            : "cursor-grab hover:scale-105 hover:shadow-[0_12px_32px_rgba(15,23,42,0.26)]",
          selected && "border-white ring-4 ring-primary/25"
        )}
        style={{ width: `${r}rem`, height: `${r}rem` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <Icon className="absolute inset-1/2 -translate-x-1/2 -translate-y-1/2 size-5" />
      </button>

      <span
        className={cn(
          "absolute left-1/2 -translate-x-1/2 mt-1.5 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[0.65rem] font-medium leading-tight text-foreground/80 bg-background/70 backdrop-blur-sm border border-border/40 transition-opacity",
          selected ? "opacity-100" : "opacity-80 group-hover:opacity-100"
        )}
        style={{
          top: `calc(100% + 2px)`,
          maxWidth: "160px",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {node.label}
      </span>
    </div>
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
