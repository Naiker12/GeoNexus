import { cn } from "@/lib/utils"
import type { ToolCallRecord } from "./types"

const TOOL_LABELS: Record<string, string> = {
  read_file: "Leyendo archivo",
  search_code: "Buscando en código",
  list_directory: "Listando directorio",
  glob_files: "Buscando archivos",
}

export interface ToolCallTraceProps {
  record: ToolCallRecord
}

export function ToolCallTrace({ record }: ToolCallTraceProps) {
  const label = TOOL_LABELS[record.toolName] ?? record.toolName
  const mainArg = String(
    (record.args as any)?.path ?? (record.args as any)?.query ?? (record.args as any)?.pattern ?? "",
  )

  return (
    <div
      className={cn(
        "mt-1 border-l-2 py-1 pl-3",
        record.status === "done"
          ? "border-l-stone-300"
          : record.status === "error"
            ? "border-l-red-300"
            : "border-l-amber-300",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px] font-medium text-stone-600">
          {record.toolName}
        </span>
        <span className="text-[11px] text-stone-400">{label}</span>
      </div>

      {mainArg && (
        <p className="mt-0.5 max-w-xs truncate font-mono text-[11px] text-stone-400">
          {mainArg}
        </p>
      )}

      {record.status === "done" && record.resultSummary && (
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="text-[11px] text-emerald-500">✓</span>
          <span className="text-[11px] text-stone-400">{record.resultSummary}</span>
          {record.durationMs !== undefined && (
            <span className="ml-auto font-mono text-[10px] text-stone-300">
              {record.durationMs}ms
            </span>
          )}
        </div>
      )}
      {record.status === "error" && (
        <span className="mt-0.5 block text-[11px] text-red-500">Error al ejecutar</span>
      )}
    </div>
  )
}
