import * as React from "react"
import { ExternalLink, RefreshCw, Eye } from "lucide-react"
import { Button } from "@/components/ui/Button"

interface AgentPreviewProps {
  previewUrl: string | null
  onRefresh?: () => void
}

export function AgentPreview({
  previewUrl,
  onRefresh,
}: AgentPreviewProps) {
  const handleOpenExternal = () => {
    if (previewUrl) window.open(previewUrl, "_blank")
  }

  return (
    <div className="flex flex-col h-full">
      {previewUrl && (
        <div className="shrink-0 flex items-center justify-end gap-1 border-b bg-muted/30 px-3 py-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onRefresh}
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleOpenExternal}
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      )}
      <div className="flex-1 bg-white dark:bg-gray-900">
        {previewUrl ? (
          <iframe
            src={previewUrl}
            className="w-full h-full border-0"
            title="Agent Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
            <Eye className="size-10 mb-3 opacity-30" />
            <p className="text-sm text-center">
              Esperando a que la preview esté lista...
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
