import * as React from "react"
import {
  ChevronDownIcon,
  CheckIcon,
  XIcon,
} from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { cn } from "@/lib/utils"
import type { AgentTraceEvent } from "@/types/chat"

interface TraceNode {
  id: string
  type: string
  parent_id?: string | null
  category: string
  title: string
  log?: string
  payload?: Record<string, unknown>
  duration: number
  user_friendly_summary?: string
  error?: string
  timestamp: string
  status: "running" | "completed" | "failed"
  children: TraceNode[]
}

function getCategoryIcon(category: string) {
  const icons: Record<string, { icon: string; accent: string; bg: string }> = {
    security: { icon: "🔒", accent: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)" },
    agent: { icon: "🧠", accent: "#8b5cf6", bg: "rgba(139, 92, 246, 0.1)" },
    connector: { icon: "🔌", accent: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)" },
    mcp: { icon: "📦", accent: "#6366f1", bg: "rgba(99, 102, 241, 0.1)" },
    database: { icon: "🗄️", accent: "#06b6d4", bg: "rgba(6, 182, 212, 0.1)" },
    llm: { icon: "🤖", accent: "#ec4899", bg: "rgba(236, 72, 153, 0.1)" },
    tool: { icon: "⚙️", accent: "#10b981", bg: "rgba(16, 185, 129, 0.1)" },
    search: { icon: "🌐", accent: "#0ea5e9", bg: "rgba(14, 165, 233, 0.1)" },
  }
  return icons[category] || { icon: "📝", accent: "#6b7280", bg: "rgba(107, 114, 128, 0.1)" }
}

function rebuildTreeFromEvents(events: AgentTraceEvent[]): TraceNode[] {
  const nodesMap: Record<string, TraceNode> = {}
  const rootNodes: TraceNode[] = []

  events.forEach((event) => {
    const existingNode = nodesMap[event.id]
    let status: TraceNode["status"] = "running"

    if (event.type === "completed") {
      status = "completed"
    } else if (event.type === "failed") {
      status = "failed"
    }

    if (existingNode) {
      nodesMap[event.id] = {
        ...existingNode,
        ...event,
        duration: event.duration ?? existingNode.duration,
        status,
      }
    } else {
      nodesMap[event.id] = {
        ...event,
        duration: event.duration ?? 0,
        status,
        children: [],
      }
    }
  })

  Object.values(nodesMap).forEach((node) => {
    if (node.parent_id && nodesMap[node.parent_id]) {
      nodesMap[node.parent_id].children.push(node)
    } else {
      rootNodes.push(node)
    }
  })

  return rootNodes
}

function RunningPulse() {
  return (
    <motion.span
      className="flex size-2 shrink-0 rounded-full bg-amber-500"
      animate={{ scale: [1, 1.35, 1], opacity: [0.8, 1, 0.8] }}
      transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
    />
  )
}

function TimelineDot({ status, accent }: { status: string; accent: string }) {
  if (status === "running") {
    return (
      <div className="relative flex items-center justify-center">
        <motion.span
          className="absolute size-4 rounded-full"
          style={{ backgroundColor: accent }}
          animate={{ scale: [1, 1.8, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
        />
        <RunningPulse />
      </div>
    )
  }
  if (status === "completed") {
    return <span className="flex size-2 shrink-0 rounded-full bg-emerald-500" />
  }
  if (status === "failed") {
    return <span className="flex size-2 shrink-0 rounded-full bg-red-500" />
  }
  return <span className="flex size-2 shrink-0 rounded-full bg-muted-foreground/40" />
}

interface TraceTreeNodeProps {
  node: TraceNode
  index: number
  totalNodes: number
  depth: number
}

function TraceTreeNode({ node, index, totalNodes, depth }: TraceTreeNodeProps) {
  const [expanded, setExpanded] = React.useState(false)
  const hasChildren = node.children && node.children.length > 0
  const display = getCategoryIcon(node.category)
  const isLast = index === totalNodes - 1
  const isCompleted = node.status === "completed"
  const isRunning = node.status === "running"
  const isFailed = node.status === "failed"

  return (
    <div className="relative">
      <div className="flex gap-3 px-3 py-2 border-t border-border/55">
        {!isLast && (
          <div
            className="absolute left-[17px] top-[30px] w-px"
            style={{
              height: "calc(100% + 4px)",
              background: isCompleted
                ? "linear-gradient(to bottom, rgb(34 197 94 / 0.5), rgb(34 197 94 / 0.15))"
                : "linear-gradient(to bottom, rgb(156 163 175 / 0.3), rgb(156 163 175 / 0.1))",
            }}
          />
        )}

        <div className="flex shrink-0 flex-col items-center pt-[7px]">
          <TimelineDot status={node.status} accent={display.accent} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="flex size-6 shrink-0 items-center justify-center rounded-full ring-1 ring-border/60"
              style={{ backgroundColor: display.bg }}
            >
              <span className="text-sm">{display.icon}</span>
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-1.5">
                <span
                  className={cn(
                    "shrink-0 text-sm leading-tight",
                    isRunning
                      ? "font-medium text-foreground"
                      : isCompleted
                      ? "text-muted-foreground"
                      : isFailed
                      ? "text-red-600 dark:text-red-400"
                      : "text-muted-foreground"
                  )}
                >
                  {node.title}
                </span>
              </div>
              {node.user_friendly_summary && (
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  {node.user_friendly_summary}
                </p>
              )}
              {node.error && <p className="text-xs text-red-500 mt-0.5">{node.error}</p>}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {node.duration > 0 && (
                <span className="font-mono text-[11px] text-muted-foreground/60">
                  {node.duration >= 1000
                    ? `${(node.duration / 1000).toFixed(1)}s`
                    : `${node.duration}ms`}
                </span>
              )}
              {isRunning && !node.duration && (
                <span className="font-mono text-[11px] text-muted-foreground/40">en curso</span>
              )}
              {isCompleted && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                >
                  <CheckIcon className="size-3.5 text-emerald-500" strokeWidth={2.3} />
                </motion.div>
              )}
              {isFailed && <XIcon className="size-3.5 text-red-500" />}
              {hasChildren && (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="flex size-4 items-center justify-center rounded text-muted-foreground/50 hover:text-foreground transition-colors"
                  aria-label={expanded ? "Contraer detalle" : "Expandir detalle"}
                >
                  <motion.div
                    animate={{ rotate: expanded ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDownIcon className="size-3" />
                  </motion.div>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {hasChildren && expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="pl-4">
              {node.children.map((childNode, childIndex) => (
                <TraceTreeNode
                  key={childNode.id}
                  node={childNode}
                  index={childIndex}
                  totalNodes={node.children.length}
                  depth={depth + 1}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function calculateTotalDuration(events: AgentTraceEvent[]): number {
  if (events.length === 0) return 0

  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
  const firstTime = new Date(sortedEvents[0].timestamp).getTime()
  const lastEvent = sortedEvents[sortedEvents.length - 1]
  const lastTime = lastEvent.duration
    ? firstTime + lastEvent.duration
    : new Date(lastEvent.timestamp).getTime()

  return lastTime - firstTime
}

interface Props {
  events?: AgentTraceEvent[]
  isStreaming?: boolean
}

export function TraceTreeView({ events = [], isStreaming = false }: Props) {
  const rootNodes = rebuildTreeFromEvents(events)

  if (rootNodes.length === 0) return null

  return (
    <div className="w-full">
      {rootNodes.map((node, index) => (
        <TraceTreeNode
          key={node.id}
          node={node}
          index={index}
          totalNodes={rootNodes.length}
          depth={0}
        />
      ))}
    </div>
  )
}
