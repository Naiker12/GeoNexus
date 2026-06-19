import { BracesIcon, FileUpIcon } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Textarea } from "@/components/ui/Textarea"

interface McpJsonImportProps {
  configJson: string
  fileName: string | null
  onConfigChange: (value: string) => void
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  onApplyJson: () => void
}

export function McpJsonImport({ configJson, fileName, onConfigChange, onFileSelect, onApplyJson }: McpJsonImportProps) {
  return (
    <section className="grid gap-2 rounded-lg border border-border/80 bg-card/40 p-3 shadow-inner">
      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <span className="flex items-center gap-2">
          <BracesIcon className="size-3.5 text-primary" />
          Config por código (JSON)
        </span>
        {fileName && <span className="truncate max-w-[120px] text-[10px] text-emerald-500 font-normal normal-case">{fileName}</span>}
      </div>
      <Textarea
        rows={9}
        className="min-h-48 font-mono text-[11px] leading-relaxed bg-background/50 border-border/60"
        value={configJson}
        onChange={e => onConfigChange(e.target.value)}
        placeholder='{"id": "mi-mcp", "name": "Mi MCP", "url": "localhost:7031"}'
      />
      <Button variant="outline" size="sm" className="h-8 text-xs cursor-pointer" asChild>
        <label className="flex items-center justify-center gap-1.5 w-full">
          <FileUpIcon className="size-3.5" />
          Seleccionar archivo config
          <input className="sr-only" type="file" accept=".json,.yaml,.yml,.toml" onChange={onFileSelect} />
        </label>
      </Button>
      {configJson && (
        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={onApplyJson}>
          Aplicar JSON al formulario
        </Button>
      )}
    </section>
  )
}
