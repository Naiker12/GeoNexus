import * as React from "react"
import {
  ActivityIcon,
  BrainCircuitIcon,
  GitBranchIcon,
  RefreshCwIcon,
  SearchIcon,
  XIcon,
} from "lucide-react"

import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import { listGraphEdges, updateNodePosition } from "@/api/data"
import type { GraphNode, GraphEdge, GraphNodeType } from "@/types/data"
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, forceX, forceY } from "d3-force"

import { useGraphEvents } from "./useGraphEvents"
import { GraphFilters, type KindFilter } from "./GraphFilters"
import { GraphActivityPanel } from "./GraphActivityPanel"
import { NodeSheet, nodeBubbleColor, nodeIcon } from "./NodeSheet"

type NodePosition = { x: number; y: number }

export function GraphPage() {
  const {
    nodes,
    edges,
    loading,
    animatingNodeIds,
    pulsingEdgeKeys,
    refresh,
    clearEphemeral,
  } = useGraphEvents()

  const [positions, setPositions] = React.useState<Record<string, NodePosition>>({})
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null)
  const [draggingNodeId, setDraggingNodeId] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [kindFilter, setKindFilter] = React.useState<KindFilter>("all")
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [activityOpen, setActivityOpen] = React.useState(false)
  const canvasRef = React.useRef<HTMLDivElement | null>(null)
  const dragMovedRef = React.useRef(false)
  const dragEndTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const positionsRef = React.useRef(positions)
  positionsRef.current = positions

  // Initialize positions from node data
  React.useEffect(() => {
    const initialPositions: Record<string, NodePosition> = {}
    nodes.forEach((node) => {
      initialPositions[node.id] = { x: node.x, y: node.y }
    })
    setPositions((prev) => ({ ...prev, ...initialPositions }))
  }, [nodes.length])

  React.useEffect(() => {
    if (searchOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [searchOpen])

  // Force-directed layout with d3-force
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
      source: e.source as string,
      target: e.target as string,
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
    const { rebuildKnowledgeGraph } = await import("@/api/data")
    try {
      await rebuildKnowledgeGraph()
      await refresh()
    } catch (e) {
      console.error("Error al recalcular red:", e)
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
        .filter((e) => visibleIds.has(e.source as string) && visibleIds.has(e.target as string))
        .map((e) => `${e.source as string}-${e.target as string}`),
    )
  }, [filteredNodes, edges])

  const nodeById = React.useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes])
  const selectedNode = selectedNodeId ? nodeById.get(selectedNodeId) : undefined

  const selectedRelations = React.useMemo(() => {
    if (!selectedNode) return []
    return edges.flatMap((edge) => {
      if (edge.source !== selectedNode.id && edge.target !== selectedNode.id) return []
      const connectedNodeId = edge.source === selectedNode.id ? edge.target : edge.source
      const connectedNode = nodeById.get(connectedNodeId as string)
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
  const recentEvents = React.useMemo(() => {
    return nodes
      .filter((n) => n.source_event)
      .sort((a, b) => b.created_at - a.created_at)
      .slice(0, 20)
  }, [nodes])

  return (
    <section className="relative z-10 h-[calc(100svh-3.5rem)] overflow-hidden px-3 py-3 sm:px-5 sm:py-4">
      <div className="mx-auto flex size-full max-w-[110rem] flex-col gap-3">
        <GraphHeader
          onRebuild={handleRebuild}
          onActivityToggle={() => setActivityOpen((p) => !p)}
          activityOpen={activityOpen}
        />

        <section className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-border/80 bg-card/95 shadow-sm backdrop-blur">
          {/* Tool bar */}
          <div className="absolute left-3 top-3 z-20 flex flex-wrap gap-2">
            {searchOpen ? (
              <div className="flex h-7 items-center gap-1 rounded-md border border-border bg-card/90 px-1.5 text-xs shadow-sm">
                <SearchIcon className="size-3.5 shrink-0 text-muted-foreground" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar nodo..."
                  className="w-32 bg-transparent text-xs outline-none placeholder:text-muted-foreground/50"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("")
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
                    setSearchQuery("")
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

            <GraphFilters kindFilter={kindFilter} onKindFilterChange={setKindFilter} />

            <span className="hidden h-7 items-center rounded-md border border-border bg-card/90 px-2 text-xs text-muted-foreground shadow-sm sm:inline-flex">
              Arrastra o toca para detalle
            </span>
          </div>

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
                Indexa un documento o envía un mensaje para poblar la red.
              </p>
              <Button variant="outline" size="sm" onClick={handleRebuild}>
                <RefreshCwIcon className="size-4" />
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
              animatingNodeIds={animatingNodeIds}
              pulsingEdgeKeys={pulsingEdgeKeys}
              searchQuery={searchQuery}
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

          <GraphActivityPanel
            events={recentEvents}
            open={activityOpen}
            onOpenChange={setActivityOpen}
            onClearEphemeral={clearEphemeral}
          />
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

function GraphHeader({
  onRebuild,
  onActivityToggle,
  activityOpen,
}: {
  onRebuild: () => void
  onActivityToggle: () => void
  activityOpen: boolean
}) {
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
              Grafo vivo — los nodos aparecen y se conectan en tiempo real al chatear,
              indexar o sincronizar.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button size="sm" variant={activityOpen ? "default" : "outline"} onClick={onActivityToggle}>
            <ActivityIcon className={cn("size-4", activityOpen && "animate-pulse")} />
            Actividad
          </Button>
          <Button variant="outline" size="sm" onClick={onRebuild}>
            <RefreshCwIcon className="size-4" />
            Recalcular red
          </Button>
        </div>
      </div>
    </header>
  )
}

const NODE_ANIMATION_STAGGER_MS = 150

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
  animatingNodeIds,
  pulsingEdgeKeys,
  searchQuery,
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
  animatingNodeIds: Set<string>
  pulsingEdgeKeys: Set<string>
  searchQuery: string
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
        <defs>
          <filter id="pulse-glow">
            <feGaussianBlur stdDeviation="0.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {edges.filter((e) => filteredEdgeIds.has(`${e.source as string}-${e.target as string}`)).map((edge) => {
          const source = positions[edge.source as string]
          const target = positions[edge.target as string]
          const active = selectedNodeId === edge.source || selectedNodeId === edge.target
          const edgeKey = `${edge.source as string}-${edge.target as string}`
          const isPulsing = pulsingEdgeKeys.has(edgeKey)

          if (!source || !target) return null

          return (
            <g key={edgeKey}>
              <line
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                className={cn(
                  "transition-all duration-300",
                  isPulsing
                    ? "stroke-amber-400/80"
                    : active
                      ? "stroke-primary/60"
                      : "stroke-primary/25"
                )}
                strokeWidth={isPulsing ? 1.5 : active ? 1.2 : Math.max(0.4, edge.strength / 140)}
                strokeDasharray={isPulsing ? "none" : active ? "1.2,1.8" : "0.8,2.2"}
                vectorEffect="non-scaling-stroke"
                filter={isPulsing ? "url(#pulse-glow)" : undefined}
              >
                {isPulsing && (
                  <animate
                    attributeName="stroke-opacity"
                    values="1;0.4;1"
                    dur="1.5s"
                    repeatCount="1"
                  />
                )}
              </line>
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

      {nodes.map((node, index) => {
        const pos = positions[node.id]
        if (!pos) return null
        const isAnimating = animatingNodeIds.has(node.id)
        const matchesSearch = searchQuery.trim()
          ? node.label.toLowerCase().includes(searchQuery.toLowerCase())
          : true

        return (
          <GraphNodeBubble
            key={node.id}
            dragging={draggingNodeId === node.id}
            node={node}
            position={pos}
            selected={selectedNodeId === node.id}
            animating={isAnimating}
            animationIndex={index}
            matchesSearch={matchesSearch}
            hasSearch={searchQuery.trim().length > 0}
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
  animating,
  animationIndex,
  matchesSearch,
  hasSearch,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  dragging: boolean
  node: GraphNode
  position: NodePosition
  selected: boolean
  animating: boolean
  animationIndex: number
  matchesSearch: boolean
  hasSearch: boolean
  onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void
  onPointerMove: (event: React.PointerEvent<HTMLButtonElement>) => void
  onPointerUp: (event: React.PointerEvent<HTMLButtonElement>) => void
}) {
  const r = 2.2 + node.weight * 0.4
  const Icon = nodeIcon(node.type)

  return (
    <div
      className={cn(
        "group absolute -translate-x-1/2 -translate-y-1/2 transition-all",
        animating && "animate-graph-node-in",
        hasSearch && !matchesSearch && "opacity-20 scale-75 pointer-events-none"
      )}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        animationDelay: animating ? `${animationIndex * NODE_ANIMATION_STAGGER_MS}ms` : "0ms",
      }}
    >
      <button
        type="button"
        className={cn(
          "relative z-10 block touch-none select-none rounded-full border-2 text-white shadow-[0_8px_24px_rgba(15,23,42,0.2)] outline-none transition-[box-shadow,transform,border-color] duration-200 focus-visible:ring-3 focus-visible:ring-ring/40",
          nodeBubbleColor(node.type),
          dragging
            ? "scale-110 cursor-grabbing border-white shadow-[0_12px_40px_rgba(15,23,42,0.32)]"
            : "cursor-grab hover:scale-105 hover:shadow-[0_12px_32px_rgba(15,23,42,0.26)]",
          selected && "border-white ring-4 ring-primary/25",
          !matchesSearch && hasSearch && "opacity-20"
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
    { label: "Chat", type: "chat_turn" },
    { label: "Web", type: "web_search" },
    { label: "Subida", type: "upload" },
    { label: "Conector", type: "connector" },
    { label: "RAG", type: "rag_recall" },
  ]

  return (
    <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card/90 p-2 shadow-sm backdrop-blur sm:left-auto sm:w-fit">
      {items.map((item) => (
        <span
          key={item.type}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground"
        >
          <span className={cn("size-2.5 rounded-full", nodeBubbleColor(item.type))} />
          {item.label}
        </span>
      ))}
    </div>
  )
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
