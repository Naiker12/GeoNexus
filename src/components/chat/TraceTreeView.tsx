import * as React from "react"
import { ChevronDownIcon, LoaderCircleIcon, SparklesIcon, CheckIcon, XIcon } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"
import type { AgentTraceEvent } from "@/types/chat"

function getCategoryIcon(category: string) {
  switch (category) {
    case "security":
      return { icon: "🔒", bg: "bg-red-100 dark:bg-red-900/30", accent: "rgb(239 68 68)" }
    case "agent":
      return { icon: "🧠", bg: "bg-purple-100 dark:bg-purple-900/30", accent: "rgb(168 85 247)" }
    case "connector":
      return { icon: "🔌", bg: "bg-blue-100 dark:bg-blue-900/30", accent: "rgb(59 130 246)" }
    case "mcp":
      return { icon: "📦", bg: "bg-orange-100 dark:bg-orange-900/30", accent: "rgb(249 115 22)" }
    case "tool":
      return { icon: "⚙️", bg: "bg-gray-100 dark:bg-gray-800", accent: "rgb(107 114 128)" }
    case "database":
    case "graph":
    case "memory":
      return { icon: "🗄️", bg: "bg-green-100 dark:bg-green-900/30", accent: "rgb(34 197 94)" }
    case "search":
      return { icon: "🌐", bg: "bg-cyan-100 dark:bg-cyan-900/30", accent: "rgb(6 182 212)" }
    case "llm":
      return { icon: "🤖", bg: "bg-amber-100 dark:bg-amber-900/30", accent: "rgb(245 158 11)" }
    case "file":
      return { icon: "📁", bg: "bg-yellow-100 dark:bg-yellow-900/30", accent: "rgb(234 179 8)" }
    default:
      return { icon: "•", bg: "bg-gray-100 dark:bg-gray-800", accent: "rgb(156 163 175)" }
  }
}

function useElapsedTime(isStreaming: boolean, events: AgentTraceEvent[]) {
  const [elapsed, setElapsed] = React.useState(0)
  const startRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    if (isStreaming) {
      startRef.current = Date.now()
      const interval = window.setInterval(() => {
        setElapsed(Date.now() - (startRef.current ?? Date.now()))
      }, 100)
      return () => window.clearInterval(interval)
    }

    // Calculate from events
    const completedEvents = events.filter(e => e.duration != null)
    if (completedEvents.length > 0) {
      const total = completedEvents.reduce((sum, e) => sum + (e.duration ?? 0), 0)
      setElapsed(total)
    }
  }, [isStreaming, events])

  return elapsed
}

interface TraceNode {
  id: string
  parent_id: string | null
  title: string
  type: string
  status: "pending" | "running" | "completed" | "failed"
  logs: string[]
  children: TraceNode[]
  duration: number
  payload: any
  user_friendly_summary: string
  error?: string
}

function rebuildTreeFromEvents(events: AgentTraceEvent[]): TraceNode[] {
  const nodesMap: Record<string, TraceNode> = {}
  const rootNodes: TraceNode[] = []

  events.forEach(event => {
    if (event.id) {
      if (!nodesMap[event.id]) {
        nodesMap[event.id] = {
          id: event.id,
          parent_id: event.parent_id ?? null,
          title: event.title ?? "",
          type: event.category ?? "system",
          status: "pending",
          logs: [],
          children: [],
          duration: 0,
          payload: event.payload ?? null,
          user_friendly_summary: event.user_friendly_summary ?? "",
          error: event.error,
        }
      }

      const node = nodesMap[event.id]

      if (event.type === "started" || event.type.endsWith("_started") || event.type === "agent_spawned") {
        node.status = "running"
        if (event.title) node.title = event.title
        if (event.category) node.type = event.category
        if (event.payload) node.payload = event.payload
        if (event.user_friendly_summary) node.user_friendly_summary = event.user_friendly_summary
      } else if (event.type === "progress" || event.type.endsWith("_progress") || event.type === "reasoning_step_progress") {
        if (event.log) node.logs.push(event.log)
        if (event.payload) node.payload = { ...node.payload, ...event.payload }
        if (event.user_friendly_summary) node.user_friendly_summary = event.user_friendly_summary
      } else if (event.type === "completed" || event.type.endsWith("_completed") || event.type === "reasoning_finished") {
        node.status = "completed"
        node.duration = event.duration ?? node.duration ?? 0
        if (event.payload) node.payload = { ...node.payload, ...event.payload }
        if (event.user_friendly_summary) node.user_friendly_summary = event.user_friendly_summary
      } else if (event.type === "failed" || event.type.endsWith("_failed")) {
        node.status = "failed"
        node.duration = event.duration ?? 0
        node.error = event.error ?? "Fallo de ejecución"
      }
    }
  })

  Object.values(nodesMap).forEach(node => {
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
    return (
      <span className="flex size-2 shrink-0 rounded-full bg-emerald-500" />
    )
  }
  if (status === "failed") {
    return (
      <span className="flex size-2 shrink-0 rounded-full bg-red-500" />
    )
  }
  return (
    <span className="flex size-2 shrink-0 rounded-full bg-muted-foreground/40" />
  )
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
  const display = getCategoryIcon(node.type)
  const isLast = index === totalNodes - 1
  const isCompleted = node.status === "completed"
  const isRunning = node.status === "running"
  const isFailed = node.status === "failed"

  return (
    <div className="relative">
      <div className="flex gap-3 px-3 py-2 border-t border-border/55">
        {/* Vertical connector line */}
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

        {/* Timeline dot */}
        <div className="flex shrink-0 flex-col items-center pt-[7px]">
          <TimelineDot status={node.status} accent={display.accent} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            {/* Icon circle */}
            <span
              className="flex size-6 shrink-0 items-center justify-center rounded-full ring-1 ring-border/60"
              style={{ backgroundColor: display.bg }}
            >
              <span className="text-sm">{display.icon}</span>
            </span>

            {/* Title */}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-1.5">
                <span className={cn(
                  "shrink-0 text-sm leading-tight",
                  isRunning ? "font-medium text-foreground" :
                  isCompleted ? "text-muted-foreground" :
                  isFailed ? "text-red-600 dark:text-red-400" :
                  "text-muted-foreground"
                )}>
                  {node.title}
                </span>
              </div>
              {node.user_friendly_summary && (
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  {node.user_friendly_summary}
                </p>
              )}
              {node.error && (
                <p className="text-xs text-red-500 mt-0.5">
                  {node.error}
                </p>
              )}
            </div>

            {/* Duration + status */}
            <div className="flex shrink-0 items-center gap-2">
              {node.duration > 0 && (
                <span className="font-mono text-[11px] text-muted-foreground/60">
                  {node.duration >= 1000
                    ? `${(node.duration / 1000).toFixed(1)}s`
                    : `${node.duration}ms`}
                </span>
              )}
              {isRunning && !node.duration && (
                <span className="font-mono text-[11px] text-muted-foreground/40">
                  en curso
                </span>
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
              {isFailed && (
                <XIcon className="size-3.5 text-red-500" />
              )}
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

      {/* Children */}
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

interface Props {
  events?: AgentTraceEvent[]
  isStreaming?: boolean
}

export function TraceTreeView({ events = [], isStreaming = false }: Props) {
  const [isExpanded, setIsExpanded] = React.useState(true)
  const reduceMotion = useReducedMotion()
  const rootNodes = rebuildTreeFromEvents(events)
  const elapsed = useElapsedTime(isStreaming, events)

  if (rootNodes.length === 0) return null

  const headerText = isStreaming
    ? `Proceso de ejecución · ${(elapsed / 1000).toFixed(1)}s`
    : `Cómo resolví esta solicitud · ${(elapsed / 1000).toFixed(1)}s`

  return (
    <motion.div
      className="w-full max-w-[42rem] overflow-hidden rounded-lg border border-border/80 bg-card/70 shadow-sm backdrop-blur-sm"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex h-10 w-full items-center justify-between gap-3 px-3 text-sm transition-colors hover:bg-muted/30"
      >
        <div className="flex min-w-0 items-center gap-2">
          {isStreaming ? (
            <LoaderCircleIcon className="size-3.5 animate-spin text-amber-500 motion-reduce:animate-none" />
          ) : (
            <SparklesIcon className="size-3.5 text-amber-500" />
          )}
          <span className="truncate text-muted-foreground">
            {headerText}
            {rootNodes.length > 0 && (
              <span className="ml-1.5 text-xs">· {rootNodes.length} pasos</span>
            )}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 0 : -90 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
        </motion.div>
      </button>

      {/* Progress bar */}
      <div className="h-px bg-border/70 overflow-hidden">
        <motion.div
          className={cn(
            "h-px bg-amber-500",
            isStreaming && "shadow-[0_0_10px_rgba(245,158,11,0.45)]",
          )}
          animate={{ width: isStreaming ? "85%" : "100%" }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>

      {/* Tree nodes */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="nodes"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {rootNodes.map((node, index) => (
              <motion.div
                key={node.id}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(index * 0.05, 0.2) }}
              >
                <TraceTreeNode
                  node={node}
                  index={index}
                  totalNodes={rootNodes.length}
                  depth={0}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
