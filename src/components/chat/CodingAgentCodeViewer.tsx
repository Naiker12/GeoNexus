import * as React from "react";
import { FileCode2 } from "lucide-react";
import type { FileNode } from "@/types/coding-agent";

interface CodingAgentCodeViewerProps {
  file: FileNode | null;
}

export function CodingAgentCodeViewer({ file }: CodingAgentCodeViewerProps) {
  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
        <FileCode2 className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-center text-sm">Selecciona un archivo para ver su código</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b bg-muted/30 flex items-center gap-2">
        <FileCode2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">{file.name}</span>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <pre className="text-xs font-mono text-foreground whitespace-pre-wrap">
          {file.content || "// No hay contenido disponible"}
        </pre>
      </div>
    </div>
  );
}
