import * as React from "react";
import { Folder, FileCode, FileText, CheckCircle2, Loader2, AlertCircle, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FileNode } from "@/types/coding-agent";

interface CodingAgentFileExplorerProps {
  files: FileNode[];
  activeFile: FileNode | null;
  onFileSelect: (file: FileNode) => void;
}

export function CodingAgentFileExplorer({
  files,
  activeFile,
  onFileSelect,
}: CodingAgentFileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = React.useState<Set<string>>(new Set());

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getFileIcon = (file: FileNode) => {
    if (file.type === "folder") return <Folder className="h-4 w-4" />;
    if (file.name.endsWith(".tsx") || file.name.endsWith(".jsx"))
      return <FileCode className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const getFileStatusIcon = (file: FileNode) => {
    switch (file.status) {
      case "done":
        return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case "creating":
        return <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />;
      case "error":
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return null;
    }
  };

  const renderFileNode = (file: FileNode, level: number = 0) => {
    const isExpanded = expandedFolders.has(file.id);
    const isActive = activeFile?.id === file.id;

    return (
      <div key={file.id} className="select-none">
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer rounded-md transition-colors",
            isActive ? "bg-primary/10 text-primary" : "hover:bg-muted/50 text-foreground"
          )}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
          onClick={() => {
            if (file.type === "folder") toggleFolder(file.id);
            else onFileSelect(file);
          }}
        >
          {file.type === "folder" && (
            <span className="text-muted-foreground">
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </span>
          )}
          {file.type === "file" && <span className="w-3" />}
          {getFileIcon(file)}
          <span className="flex-1 truncate">{file.name}</span>
          {getFileStatusIcon(file)}
        </div>
        {file.type === "folder" && isExpanded && file.children?.map((child) => renderFileNode(child, level + 1))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full border-r">
      <div className="px-3 py-2 border-b bg-muted/30">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Explorador de Archivos
        </span>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {files.length === 0 ? (
          <div className="px-3 py-4 text-center text-sm text-muted-foreground">
            No hay archivos aún
          </div>
        ) : (
          files.map((file) => renderFileNode(file))
        )}
      </div>
    </div>
  );
}
