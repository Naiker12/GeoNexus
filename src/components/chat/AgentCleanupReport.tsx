import * as React from "react"
import { Trash2, FileText, AlertTriangle, CheckCircle2 } from "lucide-react"
import type { CleanupReport } from "@/types/coding-agent"

interface AgentCleanupReportProps {
  report: CleanupReport
  onClose?: () => void
}

export function AgentCleanupReport({
  report,
  onClose,
}: AgentCleanupReportProps) {
  return (
    <div className="rounded-lg border border-amber-200/50 bg-amber-50/30 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-amber-800 flex items-center gap-1.5">
          <CheckCircle2 className="size-4 text-emerald-500" />
          Reporte de limpieza
        </h3>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Cerrar
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-md bg-white/60 p-2 text-center">
          <p className="text-lg font-bold text-foreground">{report.totalFiles}</p>
          <p className="text-[10px] text-muted-foreground">Archivos analizados</p>
        </div>
        <div className="rounded-md bg-white/60 p-2 text-center">
          <p className="text-lg font-bold text-emerald-600">{report.removedFiles}</p>
          <p className="text-[10px] text-muted-foreground">Archivos eliminados</p>
        </div>
        <div className="rounded-md bg-white/60 p-2 text-center">
          <p className="text-lg font-bold text-amber-600">{report.unusedImports}</p>
          <p className="text-[10px] text-muted-foreground">Imports sin usar</p>
        </div>
      </div>

      {report.deadCode > 0 && (
        <div className="flex items-center gap-1.5 mb-2 rounded-md bg-amber-100/50 px-2 py-1">
          <AlertTriangle className="size-3 text-amber-600" />
          <span className="text-xs text-amber-800">
            {report.deadCode} fragmentos de dead code detectados
          </span>
        </div>
      )}

      {report.details.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Detalles
          </p>
          <ul className="space-y-0.5">
            {report.details.map((detail, i) => (
              <li
                key={i}
                className="flex items-start gap-1.5 text-xs text-muted-foreground"
              >
                <FileText className="size-3 mt-0.5 shrink-0" />
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Trash2 className="size-3" />
        Usa el comando <code className="rounded bg-muted px-1 py-0.5 font-mono">/limpiar</code> para ejecutar la limpieza
      </div>
    </div>
  )
}
