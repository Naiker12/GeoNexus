import { KeyRound, ExternalLink } from "lucide-react"
import { getSetupGuide } from "@/features/workspace/mcp/mcp-setup-guides"
import type { McpServer } from "@/types/mcp"

interface McpOfflineGuideProps {
  server: McpServer
  onConfigure?: () => void
}

export function McpOfflineGuide({ server, onConfigure }: McpOfflineGuideProps) {
  const guide = getSetupGuide(server.id)

  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 px-3 py-2.5 text-sm">
      <KeyRound className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-amber-800 dark:text-amber-300 text-xs">
          {server.name} requiere configuración
        </p>
        <p className="text-[11px] text-amber-700 dark:text-amber-400/80 mt-0.5 leading-relaxed">
          {guide.message}
        </p>
        <div className="flex items-center gap-2 mt-2">
          {onConfigure && (
            <button
              type="button"
              onClick={onConfigure}
              className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-2.5 py-1 text-[10px] font-medium text-white hover:bg-amber-700 transition-colors"
            >
              Configurar ahora →
            </button>
          )}
          {guide.docsUrl && (
            <a
              href={guide.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 hover:underline"
            >
              <ExternalLink className="size-3" />
              Documentación
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
