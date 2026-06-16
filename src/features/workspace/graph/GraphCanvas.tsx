import * as React from "react"
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, forceX, forceY } from "d3-force"
import { zoomIdentity, zoom, type ZoomTransform } from "d3-zoom"
import { select as d3Select } from "d3-selection"
import { cn } from "@/lib/utils"
import type { GraphNode, GraphEdge } from "@/types/data"
import { drawEdges, drawEdgeFlow, drawNodes, findNodeAtPoint } from "./graph-draw"

const NODE_MIN_RADIUS = 5
const SCALE_EXTENT: [number, number] = [0.1, 4]

interface GraphCanvasProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  selectedNodeId: string | null
  filteredEdgeIds: Set<string>
  searchQuery: string
  onNodeSelect: (nodeId: string | null) => void
  onNodeDragMove: (nodeId: string, x: number, y: number) => void
  onNodeDragEnd: (nodeId: string, x: number, y: number) => void
  animatingNodeIds: Set<string>
  graphName?: string
  className?: string
}

export function GraphCanvas({
  nodes,
  edges,
  selectedNodeId,
  filteredEdgeIds,
  searchQuery,
  onNodeSelect,
  onNodeDragMove,
  onNodeDragEnd,
  animatingNodeIds,
  graphName,
  className,
}: GraphCanvasProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const simRef = React.useRef<ReturnType<typeof forceSimulation> | null>(null)
  const transformRef = React.useRef<ZoomTransform>(zoomIdentity)
  const positionsRef = React.useRef<Map<string, { x: number; y: number }>>(new Map())
  const draggingRef = React.useRef<{
    nodeId: string
    startX: number
    startY: number
    nodeX: number
    nodeY: number
  } | null>(null)
  const rafRef = React.useRef<number>(0)
  const animTimeRef = React.useRef<number>(0)
  const animStartRef = React.useRef<number>(0)
  const [ready, setReady] = React.useState(false)

  // Initialize simulation
  React.useEffect(() => {
    console.log("🎨 [GraphCanvas] Initializing simulation, nodes count:", nodes.length)
    
    // Always initialize positionsRef with initial node positions
    const initialPositions = new Map<string, { x: number; y: number }>()
    nodes.forEach((n) => {
      initialPositions.set(n.id, { x: n.x ?? 50, y: n.y ?? 50 })
    })
    positionsRef.current = initialPositions
    console.log("📍 [GraphCanvas] Initial positions set:", initialPositions.size)

    if (nodes.length === 0) {
      // Even if there are no nodes, set ready so canvas setup runs
      setReady(true)
      return
    }

    const nodeIds = new Set(nodes.map((n) => n.id))
    const simNodes = nodes.map((n) => ({ ...n, x: n.x ?? 50, y: n.y ?? 50 }))
    const simLinks = edges
      .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
      .map((e) => ({
        source: e.source,
        target: e.target,
        strength: e.strength / 100,
      }))

    const simulation = forceSimulation(simNodes as any)
      .force(
        "link",
        forceLink(simLinks)
          .id((d: any) => d.id)
          .distance((l: any) => 15 + (1 - l.strength) * 40)
          .strength(0.5),
      )
      .force("charge", forceManyBody().strength(-120).distanceMax(300))
      .force("collision", forceCollide(NODE_MIN_RADIUS + 6))
      .force("center", forceCenter(50, 50))
      .force("x", forceX(50).strength(0.04))
      .force("y", forceY(50).strength(0.04))
      .alpha(1)
      .alphaMin(0.001)
      .alphaDecay(0.02)
      .velocityDecay(0.4)
      .on("tick", () => {
        const newPositions = new Map<string, { x: number; y: number }>()
        simulation.nodes().forEach((n: any) => {
          newPositions.set(n.id, { x: n.x, y: n.y })
        })
        positionsRef.current = newPositions
      })

    simRef.current = simulation
    setReady(true)
    console.log("✅ [GraphCanvas] Simulation initialized, ready = true")

    return () => {
      simulation.stop()
      simRef.current = null
    }
  }, [nodes.length, edges.length])

  // Canvas setup + zoom
  React.useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const resize = () => {
      const rect = container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = rect.width + "px"
      canvas.style.height = rect.height + "px"
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(container)

    const zoomBehavior = zoom<HTMLCanvasElement, unknown>()
      .scaleExtent(SCALE_EXTENT)
      .on("zoom", (event: any) => {
        transformRef.current = event.transform
      })

    const selection = d3Select(canvas).call(zoomBehavior)

    return () => {
      observer.disconnect()
      selection.on(".zoom", null)
    }
  }, [ready])

  const renderCanvas = React.useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1

    if (!animStartRef.current) animStartRef.current = performance.now()
    animTimeRef.current = performance.now() - animStartRef.current

    ctx.save()
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, rect.width, rect.height)

    const t = transformRef.current
    ctx.translate(t.x, t.y)
    ctx.scale(t.k, t.k)

    const positions = positionsRef.current

    if (positions.size > 0) {
      const scale = t.k
      drawEdges(ctx, edges, positions, selectedNodeId, filteredEdgeIds, scale, animTimeRef.current)
      drawEdgeFlow(ctx, edges, positions, filteredEdgeIds, scale, animTimeRef.current)
      drawNodes(ctx, nodes, positions, selectedNodeId, searchQuery, scale)
    }

    ctx.restore()

    // Draw graph name overlay
    if (graphName) {
      ctx.save()
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.font = "11px -apple-system, sans-serif"
      ctx.fillStyle = "rgba(148, 163, 184, 0.5)"
      ctx.textAlign = "center"
      ctx.textBaseline = "bottom"
      ctx.fillText(graphName, rect.width / 2, rect.height - 8)
      ctx.restore()
    }

    // Keep animating
    rafRef.current = requestAnimationFrame(renderCanvas)
  }, [nodes, edges, selectedNodeId, filteredEdgeIds, searchQuery, graphName])

  // Start animation loop once ready
  React.useEffect(() => {
    if (!ready) return
    animStartRef.current = performance.now()
    rafRef.current = requestAnimationFrame(renderCanvas)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [ready, renderCanvas])

  // Pointer handlers for selection and drag
  const handlePointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const t = transformRef.current
      const x = (event.clientX - rect.left - t.x) / t.k
      const y = (event.clientY - rect.top - t.y) / t.k

      const clicked = findNodeAtPoint(x, y, nodes, positionsRef.current)

      if (clicked) {
        onNodeSelect(clicked.id)
        draggingRef.current = {
          nodeId: clicked.id,
          startX: event.clientX,
          startY: event.clientY,
          nodeX: clicked.x,
          nodeY: clicked.y,
        }
        canvas.setPointerCapture(event.pointerId)
      } else {
        onNodeSelect(null)
      }
    },
    [nodes, onNodeSelect],
  )

  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const drag = draggingRef.current
      if (!drag) return

      const dx = (event.clientX - drag.startX) / transformRef.current.k
      const dy = (event.clientY - drag.startY) / transformRef.current.k
      const newX = drag.nodeX + dx
      const newY = drag.nodeY + dy

      const sim = simRef.current
      if (sim) {
        const simNode = sim.nodes().find((n: any) => n.id === drag.nodeId)
        if (simNode) {
          simNode.x = newX
          simNode.y = newY
          sim.alpha(0.3).restart()
        }
      }

      onNodeDragMove(drag.nodeId, newX, newY)
    },
    [onNodeDragMove],
  )

  const handlePointerUp = React.useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const drag = draggingRef.current
      if (!drag) return

      const dx = (event.clientX - drag.startX) / transformRef.current.k
      const dy = (event.clientY - drag.startY) / transformRef.current.k
      const newX = drag.nodeX + dx
      const newY = drag.nodeY + dy

      onNodeDragEnd(drag.nodeId, newX, newY)

      const canvas = canvasRef.current
      canvas?.releasePointerCapture(event.pointerId)
      draggingRef.current = null
    },
    [onNodeDragEnd],
  )

  return (
    <div
      ref={containerRef}
      className={cn("relative size-full min-h-[32rem] overflow-hidden bg-background/75", className)}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(148,163,184,0.2)_1px,transparent_1px)] bg-[size:28px_28px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,color-mix(in_oklch,var(--primary),transparent_84%),transparent_44%)]" />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
    </div>
  )
}
