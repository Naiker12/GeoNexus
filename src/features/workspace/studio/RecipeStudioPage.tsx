import dagre from "@dagrejs/dagre"
import {
  Brain02Icon,
  DatabaseIcon,
  Download01Icon,
  GitBranchIcon,
  PlayIcon,
  RefreshIcon,
  Wrench01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Background,
  type Connection,
  Controls,
  type Edge,
  MiniMap,
  type Node,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
} from "@xyflow/react"
import * as React from "react"

import { Button } from "@/components/ui/Button"
import { useToast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"

// Node visual components
function AgentNodeComponent({ data }: { data: any }) {
  return (
    <div className="glass-panel rounded-2xl p-3.5 min-w-[220px] border-l-4 border-l-primary shadow-md bg-card/95">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded-xl bg-muted/80 text-foreground border border-border/60">
          <HugeiconsIcon icon={Brain02Icon} strokeWidth={1.75} className="size-4" />
        </div>
        <div>
          <div className="text-xs font-bold text-foreground font-sans">{data.label}</div>
          <div className="text-[10px] text-muted-foreground font-mono">{data.role}</div>
        </div>
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
        {data.description}
      </div>
    </div>
  )
}

function ConnectorNodeComponent({ data }: { data: any }) {
  return (
    <div className="glass-panel rounded-2xl p-3.5 min-w-[220px] border-l-4 border-l-cyan-500 shadow-md bg-card/95">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded-xl bg-muted/80 text-cyan-500 border border-border/60">
          <HugeiconsIcon icon={DatabaseIcon} strokeWidth={1.75} className="size-4" />
        </div>
        <div>
          <div className="text-xs font-bold text-foreground font-sans">{data.label}</div>
          <div className="text-[10px] text-muted-foreground font-mono">{data.sourceType}</div>
        </div>
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground font-mono">
        {data.endpoint || "Capas GeoJSON / PostGIS"}
      </div>
    </div>
  )
}

function ToolNodeComponent({ data }: { data: any }) {
  return (
    <div className="glass-panel rounded-2xl p-3.5 min-w-[220px] border-l-4 border-l-emerald-500 shadow-md bg-card/95">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded-xl bg-muted/80 text-emerald-500 border border-border/60">
          <HugeiconsIcon icon={Wrench01Icon} strokeWidth={1.75} className="size-4" />
        </div>
        <div>
          <div className="text-xs font-bold text-foreground font-sans">{data.label}</div>
          <div className="text-[10px] text-muted-foreground font-mono">{data.toolCategory}</div>
        </div>
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
        {data.action}
      </div>
    </div>
  )
}

const nodeTypes = {
  agentNode: AgentNodeComponent,
  connectorNode: ConnectorNodeComponent,
  toolNode: ToolNodeComponent,
}

const initialNodes: Node[] = [
  {
    id: "1",
    type: "connectorNode",
    position: { x: 50, y: 150 },
    data: {
      label: "Capa Catastral PostGIS",
      sourceType: "Vector GIS Layer",
      endpoint: "localhost:5432/gis_db",
    },
  },
  {
    id: "2",
    type: "agentNode",
    position: { x: 350, y: 100 },
    data: {
      label: "Agente Auditor Geoespacial",
      role: "Spatial Reasoning LLM",
      description: "Analiza polígonos de zonificación y calcula intersecciones de riesgo.",
    },
  },
  {
    id: "3",
    type: "toolNode",
    position: { x: 680, y: 100 },
    data: {
      label: "Buffer & Intersection Tool",
      toolCategory: "MCP GIS Tools",
      action: "Genera buffer de 500m y exporta GeoJSON con geometrías corregidas.",
    },
  },
  {
    id: "4",
    type: "agentNode",
    position: { x: 350, y: 280 },
    data: {
      label: "Agente Sintetizador de Informes",
      role: "Report Generator",
      description: "Genera resumen ejecutivo con métricas de área y tablas Markdown.",
    },
  },
]

const initialEdges: Edge[] = [
  {
    id: "e1-2",
    source: "1",
    target: "2",
    animated: true,
    style: { stroke: "var(--color-primary, #10b981)", strokeWidth: 2 },
  },
  {
    id: "e2-3",
    source: "2",
    target: "3",
    animated: true,
    style: { stroke: "#10b981", strokeWidth: 2 },
  },
  {
    id: "e1-4",
    source: "1",
    target: "4",
    animated: true,
    style: { stroke: "var(--color-primary, #10b981)", strokeWidth: 2 },
  },
]

export function RecipeStudioPage() {
  const { toast } = useToast()
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [isRunning, setIsRunning] = React.useState(false)

  const onConnect = React.useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge({ ...params, animated: true, style: { stroke: "#10b981", strokeWidth: 2 } }, eds)
      ),
    [setEdges]
  )

  const handleAutoLayout = React.useCallback(() => {
    const dagreGraph = new dagre.graphlib.Graph()
    dagreGraph.setDefaultEdgeLabel(() => ({}))
    dagreGraph.setGraph({ rankdir: "LR", nodesep: 60, ranksep: 120 })

    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: 220, height: 90 })
    })

    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target)
    })

    dagre.layout(dagreGraph)

    const layoutedNodes = nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id)
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - 110,
          y: nodeWithPosition.y - 45,
        },
      }
    })

    setNodes(layoutedNodes)
    toast({
      title: "Flujo organizado",
      description: "Nodos del DAG ordenados automáticamente.",
      variant: "info",
    })
  }, [nodes, edges, setNodes, toast])

  const handleRunWorkflow = () => {
    setIsRunning(true)
    toast({
      title: "Ejecutando Pipeline",
      description: "Procesando capas espaciales con agentes encadenados...",
      variant: "info",
    })
    setTimeout(() => {
      setIsRunning(false)
      toast({
        title: "Pipeline completado",
        description: "Se ejecutaron los 4 nodos sin discrepancias espaciales.",
        variant: "success",
      })
    }, 2500)
  }

  const handleExportJson = () => {
    const recipe = {
      name: "Flujo Geoespacial GeoNexus",
      version: "1.0.0",
      nodes,
      edges,
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(recipe, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `recipe_dag_${Date.now()}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast({
      title: "Receta exportada",
      description: "Archivo JSON descargado.",
      variant: "success",
    })
  }

  return (
    <div className="flex flex-col flex-1 h-full w-full overflow-hidden select-none bg-background">
      {/* Barra de Herramientas del Studio */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/70 bg-card/60 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-xl bg-muted text-foreground border border-border/70">
            <HugeiconsIcon icon={GitBranchIcon} strokeWidth={1.75} className="size-4" />
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-bold text-foreground font-sans">
              Studio de Flujos DAG (Recipes)
            </h1>
            <p className="text-[10px] text-muted-foreground font-mono">
              Pipeline visual para orquestar agentes, conectores espaciales y herramientas MCP.
            </p>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoLayout}
            className="gap-1 text-xs font-mono rounded-xl h-7.5 px-2.5 hover:bg-muted cursor-pointer"
            title="Auto-organizar nodos"
          >
            <HugeiconsIcon
              icon={RefreshIcon}
              strokeWidth={1.75}
              className="size-3 text-muted-foreground"
            />
            <span>Reorganizar</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJson}
            className="gap-1 text-xs font-mono rounded-xl h-7.5 px-2.5 hover:bg-muted cursor-pointer"
            title="Exportar Receta JSON"
          >
            <HugeiconsIcon
              icon={Download01Icon}
              strokeWidth={1.75}
              className="size-3 text-muted-foreground"
            />
            <span>Exportar</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleRunWorkflow}
            disabled={isRunning}
            className="gap-1.5 text-xs font-mono rounded-xl h-7.5 px-3 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-2xs"
          >
            <HugeiconsIcon
              icon={PlayIcon}
              strokeWidth={2}
              className={cn("size-3", isRunning && "animate-spin")}
            />
            <span>{isRunning ? "Ejecutando..." : "Ejecutar"}</span>
          </Button>
        </div>
      </div>

      {/* Lienzo Interactivo de React Flow */}
      <div className="flex-1 w-full h-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          className="bg-muted/10"
        >
          <Background gap={20} size={1} color="currentColor" className="opacity-10" />
          <Controls className="bg-card border border-border/80 rounded-2xl shadow-lg fill-foreground" />
          <MiniMap
            className="bg-card/90 border border-border/80 rounded-2xl overflow-hidden shadow-lg"
            nodeColor="#10b981"
            maskColor="rgba(0, 0, 0, 0.4)"
          />
        </ReactFlow>
      </div>
    </div>
  )
}
