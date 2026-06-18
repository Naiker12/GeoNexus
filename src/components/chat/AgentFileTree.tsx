import * as React from "react"
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, Loader2, CheckCircle2, AlertCircle, X, History } from "lucide-react"
import type { FileNode } from "@/types/coding-agent"

interface AgentFileTreeProps {
  files: FileNode[]
  activeFile: FileNode | null
  onFileSelect: (file: FileNode) => void
}

const statusIcons: Record<string, React.ReactNode> = {
  done: <CheckCircle2 className="size-3 text-emerald-500" />,
  creating: <Loader2 className="size-3 text-amber-500 animate-spin" />,
  error: <AlertCircle className="size-3 text-red-500" />,
}

function sortNodes(nodes: FileNode[]): FileNode[] {
  return [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1
    return a.name.localeCompare(b.name)
  }).map(n => ({
    ...n,
    children: n.children ? sortNodes(n.children) : undefined,
  }))
}

function DirArrow({ expanded, visible }: { expanded: boolean; visible: boolean }) {
  return (
    <span className={`shrink-0 transition-opacity ${visible ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
      {expanded ? (
        <ChevronDown className="size-3 text-muted-foreground" />
      ) : (
        <ChevronRight className="size-3 text-muted-foreground" />
      )}
    </span>
  )
}

function FileTreeItem({
  node,
  depth,
  activeFile,
  onFileSelect,
}: {
  node: FileNode
  depth: number
  activeFile: FileNode | null
  onFileSelect: (file: FileNode) => void
}) {
  const [expanded, setExpanded] = React.useState(true)
  const isDirectory = node.type === "directory"
  const isActive = activeFile?.path === node.path
  const isOriginal = node.isOriginal

  if (isDirectory) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="group flex w-full items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-muted/50"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          <DirArrow expanded={expanded} visible={true} />
          {expanded ? (
            <FolderOpen className="size-3.5 shrink-0 text-amber-500" />
          ) : (
            <Folder className="size-3.5 shrink-0 text-amber-400" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {expanded && node.children && (
          <div>
            {sortNodes(node.children).map((child) => (
              <FileTreeItem
                key={child.path}
                node={child}
                depth={depth + 1}
                activeFile={activeFile}
                onFileSelect={onFileSelect}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onFileSelect(node)}
      className={`group flex w-full items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-muted/50 ${
        isActive ? "bg-amber-50 text-amber-700 font-medium" : ""
      }`}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
    >
      {isOriginal ? (
        <History className="size-3.5 shrink-0 text-blue-400" />
      ) : (
        <File className="size-3.5 shrink-0 text-muted-foreground" />
      )}
      <span className="truncate">{node.name}</span>
      {isOriginal && (
        <span className="text-[9px] text-blue-400 ml-1 shrink-0">original</span>
      )}
      {node.language && !isOriginal && (
        <span className="text-[9px] text-muted-foreground ml-auto">{node.language}</span>
      )}
      {node.status && statusIcons[node.status] && (
        <span className="ml-auto">{statusIcons[node.status]}</span>
      )}
    </button>
  )
}

export function AgentFileTree({
  files,
  activeFile,
  onFileSelect,
}: AgentFileTreeProps) {
  const ordered = React.useMemo(() => sortNodes(files), [files])

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
        <Folder className="size-10 mb-3 opacity-30" />
        <p className="text-sm text-center">No hay archivos aún. El agente los creará durante la ejecución.</p>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      <div className="w-1/2 min-w-0 overflow-y-auto border-r py-1">
        {ordered.map((node) => (
          <FileTreeItem
            key={node.path}
            node={node}
            depth={0}
            activeFile={activeFile}
            onFileSelect={onFileSelect}
          />
        ))}
      </div>
      <div className="w-1/2 min-w-0 overflow-y-auto">
        {activeFile && activeFile.content ? (
          <div className="flex flex-col h-full">
            <div className="shrink-0 flex items-center justify-between border-b bg-stone-50 px-3 py-1.5">
              <span className="text-[11px] font-mono text-stone-500">{activeFile.name}</span>
              <button
                type="button"
                onClick={() => onFileSelect({ ...activeFile, content: undefined })}
                className="p-0.5 rounded hover:bg-stone-200 text-stone-400"
              >
                <X className="size-3" />
              </button>
            </div>
            <pre className="flex-1 overflow-auto p-3 text-[13px] leading-relaxed font-mono text-stone-700 bg-stone-50/50 m-0 whitespace-pre">
              <code>{activeFile.content}</code>
            </pre>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
            <File className="size-8 mb-2 opacity-30" />
            <p className="text-xs text-center">Selecciona un archivo para ver su contenido</p>
          </div>
        )}
      </div>
    </div>
  )
}
