import * as React from "react"
import {
  ActivityIcon,
  BrainCircuitIcon,
  GitBranchIcon,
  Maximize2Icon,
  MinusIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  XIcon,
} from "lucide-react"

import { Button } from "@/components/ui/Button"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { cn } from "@/lib/utils"
import { updateNodePosition } from "@/api/data"
import type { GraphNode, GraphEdge, GraphNodeKind } from "@/types/graph"

import { useGraphEvents } from "./useGraphEvents"
import { GraphFilters, type KindFilter } from "./GraphFilters"
import { GraphCanvas } from "./GraphCanvas"
import { GraphActivityPanel } from "./GraphActivityPanel"
import { NodeSheet, nodeIcon } from "./NodeSheet"
import { nodeTypeLabel, NODE_COLORS } from "./graph-colors"

export function GraphPage() {
  const {
    nodes,
    edges,
    loading,
    animatingNodeIds,
    pulsingEdgeKeys,
    refresh,
    clearEphemeral,
    setNodes,
  } = useGraphEvents()

  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [kindFilter, setKindFilter] = React.useState<KindFilter>("all")
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [activityOpen, setActivityOpen] = React.useState(false)
  const [rebuilding, setRebuilding] = React.useState(false)
  const [layoutKey, setLayoutKey] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const canvasApiRef = React.useRef<{ fitToScreen: () => void; resetZoom: () => void } | null>(null)

  React.useEffect(() => {
    if (searchOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [searchOpen])

  const handleRebuild = async () => {
    setRebuilding(true)
    setLayoutKey((k) => k + 1)
    const { rebuildKnowledgeGraph } = await import("@/api/data")
    try {
      await rebuildKnowledgeGraph()
      await refresh()
    } catch (e) {
      console.error("Error al recalcular red:", e)
    } finally {
      setTimeout(() => setRebuilding(false), 400)
    }
  }

  const filteredNodes = React.useMemo(() => {
    let result = nodes
    if (kindFilter !== "all") {
      result = result.filter((n) => n.kind === kindFilter)
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

  const handleNodeDragEnd = React.useCallback(
    (nodeId: string, x: number, y: number) => {
      updateNodePosition(nodeId, x, y).catch(console.error)
    },
    [],
  )

  const hasGraphData = nodes.length > 0
  const recentEvents = React.useMemo(() => {
    return nodes
      .slice()
      .sort((a, b) => b.created_at - a.created_at)
      .slice(0, 20)
  }, [nodes])

  return (
    <ErrorBoundary>
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
          </div>

          {/* Zoom controls */}
          <div className="absolute right-3 top-3 z-20 flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 bg-card/90"
              onClick={() => canvasApiRef.current?.fitToScreen()}
              title="Ajustar a pantalla"
            >
              <Maximize2Icon className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 bg-card/90"
              onClick={() => canvasApiRef.current?.resetZoom()}
              title="Zoom 1:1"
            >
              <span className="text-xs font-medium">1:1</span>
            </Button>
          </div>

          {loading || rebuilding ? (
            <div className="flex size-full items-center justify-center gap-2 text-sm text-muted-foreground bg-background/75">
              <RefreshCwIcon className={cn("size-4", rebuilding && "animate-spin")} />
              {rebuilding ? "Recalculando red..." : "Cargando base de conocimiento..."}
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
              nodes={filteredNodes}
              edges={edges}
              selectedNodeId={selectedNodeId}
              filteredEdgeIds={filteredEdgeIds}
              searchQuery={searchQuery}
              animatingNodeIds={animatingNodeIds}
              onNodeSelect={setSelectedNodeId}
              onNodeDragMove={(_nodeId, _x, _y) => {}}
              onNodeDragEnd={handleNodeDragEnd}
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
        onNodeDelete={(nodeId) => {
          refresh()
          setSelectedNodeId(null)
        }}
      />
    </section>
    </ErrorBoundary>
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

function GraphLegend() {
  const items: Array<{ label: string; type: GraphNodeKind }> = [
    { label: "Norma", type: "norma" },
    { label: "Documento", type: "documento" },
    { label: "Capa GIS", type: "capa" },
    { label: "Zona", type: "zona" },
    { label: "Concepto", type: "concept" },
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
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: NODE_COLORS[item.type] }}
          />
          {item.label}
        </span>
      ))}
    </div>
  )
}
