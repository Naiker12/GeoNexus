import { useState } from "react";
import { ChevronDown, ChevronRight, AlertTriangle, CheckCircle,
         Loader2, Clock, Paperclip } from "lucide-react";
import { useAgentTaskStore } from "../store/useAgentTaskStore";
import type { AgentTask } from "../types";

const STATUS_CONFIG = {
  todo:    { label: "Pendiente", color: "text-muted-foreground",    icon: Clock },
  running: { label: "Ejecutando", color: "text-amber-500",                   icon: Loader2 },
  review:  { label: "Revisión",  color: "text-blue-400",                     icon: Clock },
  blocked: { label: "Bloqueado", color: "text-red-400",                      icon: AlertTriangle },
  done:    { label: "Completado", color: "text-emerald-500",                 icon: CheckCircle },
} as const;

const PRIORITY_DOT = {
  low:    "bg-gray-400",
  normal: "bg-blue-400",
  high:   "bg-amber-400",
  urgent: "bg-red-500",
};

interface Props { task: AgentTask; }

export function AgentTaskCard({ task }: Props) {
  const [expanded, setExpanded] = useState(task.status === "running");
  const { startTask, cancelTask, retryTask, deleteTask } = useAgentTaskStore();
  const cfg = STATUS_CONFIG[task.status];
  const StatusIcon = cfg.icon;

  const timeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60_000) return "ahora";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
    return `${Math.floor(diff / 3_600_000)}h`;
  };

  return (
    <div className="border-b border-[var(--color-border)] last:border-0">
      <div
        className="flex items-start gap-2 px-4 py-3 cursor-pointer hover:bg-accent/30"
        onClick={() => setExpanded(!expanded)}
      >
        <button className="mt-0.5 text-muted-foreground shrink-0">
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[task.priority]}`} />
            <span className="text-sm font-medium text-foreground truncate">
              {task.title}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <StatusIcon
              size={10}
              className={`${cfg.color} ${task.status === "running" ? "animate-spin" : ""}`}
            />
            <span className={`text-xs ${cfg.color}`}>{cfg.label}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">
              {timeAgo(task.updatedAt)}
            </span>
            {task.artifacts.length > 0 && (
              <>
                <span className="text-xs text-muted-foreground">·</span>
                <Paperclip size={10} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {task.artifacts.length}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-3 pl-8 space-y-2">
          {task.notes && (
            <p className="text-xs text-muted-foreground">{task.notes}</p>
          )}

          {task.status === "blocked" && task.blockedReason && (
            <div className="text-xs text-red-400 bg-red-400/10 rounded px-2 py-1.5">
              ⚠ {task.blockedReason}
            </div>
          )}

          {task.comments.length > 0 && (
            <div className="bg-muted/30 rounded p-2 space-y-1 max-h-24 overflow-y-auto">
              {task.comments.slice(-5).map((comment, i) => (
                <p key={i} className="text-xs text-muted-foreground font-mono">
                  {comment}
                </p>
              ))}
            </div>
          )}

          {task.artifacts.length > 0 && (
            <div className="space-y-1">
              {task.artifacts.map((a) => (
                <div key={a.id} className="flex items-center gap-1.5 text-xs">
                  <Paperclip size={10} className="text-amber-500" />
                  <span className="text-foreground">{a.label}</span>
                  {a.path && (
                    <span className="text-muted-foreground truncate">{a.path}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            {task.status === "todo" && (
              <button
                onClick={() => startTask(task.id)}
                className="text-xs px-2 py-1 rounded bg-amber-500
                           text-white hover:opacity-90 transition-opacity"
              >
                Iniciar
              </button>
            )}
            {task.status === "running" && (
              <button
                onClick={() => cancelTask(task.id)}
                className="text-xs px-2 py-1 rounded border border-red-400
                           text-red-400 hover:bg-red-400/10 transition-colors"
              >
                Cancelar
              </button>
            )}
            {task.status === "blocked" && (
              <button
                onClick={() => retryTask(task.id)}
                className="text-xs px-2 py-1 rounded border border-amber-500
                           text-amber-600 hover:bg-amber-500 hover:text-white transition-colors"
              >
                Reintentar
              </button>
            )}
            {(task.status === "done" || task.status === "blocked") && (
              <button
                onClick={() => deleteTask(task.id)}
                className="text-xs px-2 py-1 text-muted-foreground
                           hover:text-red-400 transition-colors ml-auto"
              >
                Eliminar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
