import * as React from "react";
import { ExternalLink, RefreshCw, Code, Eye } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodingAgentCodeViewer } from "./CodingAgentCodeViewer";
import type { FileNode } from "@/types/coding-agent";

interface CodingAgentPreviewProps {
  previewUrl: string | null;
  activeFile: FileNode | null;
}

export function CodingAgentPreview({
  previewUrl,
  activeFile,
}: CodingAgentPreviewProps) {
  const [tab, setTab] = React.useState<"preview" | "code">("preview");
  const [cacheBuster, setCacheBuster] = React.useState<number>(() => Date.now());
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  const handleRefresh = React.useCallback(() => {
    setCacheBuster(Date.now());
  }, []);

  const handleOpenExternal = React.useCallback(() => {
    if (previewUrl) window.open(previewUrl, "_blank");
  }, [previewUrl]);

  const iframeSrc = React.useMemo(() => {
    if (!previewUrl) return "";
    const sep = previewUrl.includes("?") ? "&" : "?";
    return `${previewUrl}${sep}cb=${cacheBuster}`;
  }, [previewUrl, cacheBuster]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b bg-muted/30 flex items-center justify-between">
        <Tabs
          value={tab}
          onValueChange={(v: string) => setTab(v as "preview" | "code")}
          className="w-auto"
        >
          <TabsList className="h-7">
            <TabsTrigger value="preview" className="text-xs px-2 py-1 flex items-center gap-1">
              <Eye className="h-3 w-3" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="code" className="text-xs px-2 py-1 flex items-center gap-1">
              <Code className="h-3 w-3" />
              Código
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-1">
          {tab === "preview" && previewUrl && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleRefresh}
                title="Recargar preview"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleOpenExternal}
                title="Abrir en pestaña externa"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </div>

      <TabsContent value="preview" className="flex-1 p-0 m-0">
        <div className="w-full h-full bg-white dark:bg-gray-900">
          {previewUrl ? (
            <iframe
              ref={iframeRef}
              src={iframeSrc}
              className="w-full h-full border-0"
              title="GeoNexus Agent Preview"
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
              <Eye className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-center text-sm">
                Esperando a que la preview esté lista...
              </p>
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="code" className="flex-1 p-0 m-0">
        <CodingAgentCodeViewer file={activeFile} />
      </TabsContent>
    </div>
  );
}
