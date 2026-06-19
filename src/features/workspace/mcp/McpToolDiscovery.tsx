import { Loader2Icon, SearchIcon } from "lucide-react"
import { Button } from "@/components/ui/Button"
import type { PreviewTool } from "@/api/mcp"

interface McpToolDiscoveryProps {
  toolsRaw: string
  onToolsRawChange: (value: string) => void
  discoveredTools: PreviewTool[]
  selectedToolNames: Set<string>
  discovering: boolean
  onDiscover: () => void
  onToggleTool: (name: string) => void
}

export function McpToolDiscovery({
  toolsRaw, onToolsRawChange,
  discoveredTools, selectedToolNames,
  discovering, onDiscover, onToggleTool,
}: McpToolDiscoveryProps) {
  return (
    <>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <FormInput
            label="Tools (opcional)"
            placeholder={discoveredTools.length === 0 ? "buffer, distance, load_layer" : "Selecciona abajo"}
            value={toolsRaw}
            onChange={onToolsRawChange}
          />
        </div>
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs shrink-0"
          onClick={onDiscover} disabled={discovering}>
          {discovering ? <Loader2Icon className="size-3 animate-spin" /> : <SearchIcon className="size-3" />}
          {discovering ? "Descubriendo..." : "Descubrir tools"}
        </Button>
      </div>
      {discoveredTools.length > 0 && (
        <div className="max-h-40 overflow-y-auto rounded-lg border border-border/60 bg-background/30 p-2 space-y-1">
          {discoveredTools.map(tool => (
            <label key={tool.name} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent/50 cursor-pointer text-xs">
              <input type="checkbox" className="size-3.5 accent-primary"
                checked={selectedToolNames.has(tool.name)}
                onChange={() => onToggleTool(tool.name)} />
              <span className="font-mono font-medium text-foreground">{tool.name}</span>
              {tool.description && (
                <span className="text-muted-foreground/60 truncate ml-1">{tool.description}</span>
              )}
            </label>
          ))}
        </div>
      )}
      {selectedToolNames.size > 0 && (
        <p className="text-[10px] text-emerald-500 font-medium">
          {selectedToolNames.size} tool{selectedToolNames.size !== 1 ? "s" : ""} seleccionada{selectedToolNames.size !== 1 ? "s" : ""}
        </p>
      )}
    </>
  )
}

function FormInput({ label, placeholder, value, onChange }: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void
}) {
  return (
    <label className="grid gap-1 text-[11px] font-semibold text-muted-foreground">
      {label}
      <input
        placeholder={placeholder}
        className="h-7 w-full rounded-md border border-border/60 bg-background/50 px-2.5 text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
        value={value} onChange={e => onChange(e.target.value)}
      />
    </label>
  )
}
