import { nodeColor } from "./graph-colors"
import type { GraphNode, GraphEdge } from "@/types/data"

const BASE_NODE_RADIUS = 5

export function getNodeRadius(node: GraphNode): number {
  const weightFactor = Math.log(Math.max(node.weight, 1) + 1) / 5
  return BASE_NODE_RADIUS + Math.min(weightFactor * 3, 6)
}

export function getNodeVisuals(node: GraphNode): {
  radius: number
  opacity: number
  glow: boolean
} {
  const score = (node as any).memory_score ?? node.weight
  return {
    radius: 3 + Math.min(score * 1.5, 7),
    opacity: Math.max(0.2, Math.min(score / 5, 1.0)),
    glow: score > 4,
  }
}

export function drawEdges(
  ctx: CanvasRenderingContext2D,
  edges: GraphEdge[],
  positions: Map<string, { x: number; y: number }>,
  selectedNodeId: string | null,
  filter: Set<string> | null,
  scale: number,
  animTime: number = 0,
) {
  ctx.save()

  for (const edge of edges) {
    const key = `${edge.source}-${edge.target}`
    if (filter && !filter.has(key)) continue

    const sourcePos = positions.get(edge.source as string)
    const targetPos = positions.get(edge.target as string)
    if (!sourcePos || !targetPos) continue

    const isActive =
      selectedNodeId === edge.source || selectedNodeId === edge.target

    ctx.beginPath()
    ctx.moveTo(sourcePos.x, sourcePos.y)
    ctx.lineTo(targetPos.x, targetPos.y)

    if (isActive) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)"
      ctx.lineWidth = Math.max(0.6, 1.5 / scale)
    } else {
      ctx.strokeStyle = `rgba(180, 180, 200, ${Math.max(0.1, edge.strength / 300)})`
      ctx.lineWidth = Math.max(0.4, 0.8 / scale)
    }
    ctx.stroke()
  }

  ctx.restore()
}

export function drawEdgeFlow(
  ctx: CanvasRenderingContext2D,
  edges: GraphEdge[],
  positions: Map<string, { x: number; y: number }>,
  filter: Set<string> | null,
  scale: number,
  animTime: number,
) {
  ctx.save()

  for (const edge of edges) {
    const key = `${edge.source}-${edge.target}`
    if (filter && !filter.has(key)) continue

    const sourcePos = positions.get(edge.source as string)
    const targetPos = positions.get(edge.target as string)
    if (!sourcePos || !targetPos) continue

    const dx = targetPos.x - sourcePos.x
    const dy = targetPos.y - sourcePos.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 1) continue

    // 2 dots per edge, offset by half a cycle
    for (let i = 0; i < 2; i++) {
      const t = ((animTime / 1400 + i * 0.5) % 1)
      const px = sourcePos.x + dx * t
      const py = sourcePos.y + dy * t

      const dotRadius = Math.max(1.5, (2.5 - dist * 0.008) / scale)
      const alpha = Math.sin(t * Math.PI) * 0.6

      ctx.beginPath()
      ctx.arc(px, py, dotRadius, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(200, 200, 255, ${alpha})`
      ctx.fill()
    }
  }

  ctx.restore()
}

export function drawNodes(
  ctx: CanvasRenderingContext2D,
  nodes: GraphNode[],
  positions: Map<string, { x: number; y: number }>,
  selectedNodeId: string | null,
  searchQuery: string,
  scale: number,
) {
  const q = searchQuery.trim().toLowerCase()

  for (const node of nodes) {
    const pos = positions.get(node.id)
    if (!pos) continue

    const color = nodeColor(node.type)
    const radius = getNodeRadius(node)
    const isSelected = node.id === selectedNodeId
    const matchesSearch = q ? node.label.toLowerCase().includes(q) : true
    const alpha = matchesSearch ? 1 : 0.15

    ctx.save()
    ctx.globalAlpha = alpha

    if (isSelected) {
      ctx.shadowBlur = Math.min(15, 15 / scale)
      ctx.shadowColor = color
    }

    ctx.beginPath()
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()

    if (isSelected) {
      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = Math.min(2, 1.5 / scale)
      ctx.stroke()
    }

    if (node.pinned) {
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, radius + 2, 0, Math.PI * 2)
      ctx.strokeStyle = "rgba(255, 215, 0, 0.6)"
      ctx.lineWidth = Math.min(1.5, 1 / scale)
      ctx.stroke()
    }

    ctx.restore()

    if (scale > 0.6 || isSelected) {
      const labelAlpha = isSelected ? 1 : Math.min(1, (scale - 0.6) / 0.4)
      if (labelAlpha > 0) {
        ctx.save()
        ctx.globalAlpha = labelAlpha * alpha
        ctx.font = `${Math.max(8, 10 / scale)}px -apple-system, sans-serif`
        ctx.fillStyle = "rgba(220, 215, 205, 0.85)"
        ctx.textAlign = "center"
        ctx.textBaseline = "top"

        const maxChars = Math.max(8, Math.floor(16 / scale))
        const label =
          node.label.length > maxChars
            ? node.label.slice(0, maxChars) + "\u2026"
            : node.label

        ctx.fillText(label, pos.x, pos.y + radius + 3 / scale)
        ctx.restore()
      }
    }
  }
}

export function findNodeAtPoint(
  x: number,
  y: number,
  nodes: GraphNode[],
  positions: Map<string, { x: number; y: number }>,
): GraphNode | null {
  for (const node of nodes) {
    const pos = positions.get(node.id)
    if (!pos) continue
    const dx = pos.x - x
    const dy = pos.y - y
    const r = getNodeRadius(node) + 4
    if (dx * dx + dy * dy <= r * r) return node
  }
  return null
}
