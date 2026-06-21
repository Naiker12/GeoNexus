import { useState } from "react";
import { Plus, Zap } from "lucide-react";
import { useAgentTaskStore } from "../store/useAgentTaskStore";
import { useAgentTaskEvents } from "../hooks/useAgentTaskEvents";
import { AgentTaskCard } from "./AgentTaskCard";
import { AgentCreateTask } from "./AgentCreateTask";

export function AgentTaskPanel() {
  useAgentTaskEvents();

  const tasks = useAgentTaskStore((s) => s.tasks);
  const isLoading = useAgentTaskStore((s) => s.isLoading);
  const [showCreate, setShowCreate] = useState(false);

  const sorted = [...tasks].sort((a, b) => {
    const order = { running: 0, todo: 1, blocked: 2, review: 3, done: 4 };
    return (order[a.status] ?? 9) - (order[b.status] ?? 9);
  });

  return (
    <div className="w-full min-w-[380px] max-w-[480px] border-l border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col animate-in slide-in-from-right">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-amber-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tareas del Agente
          </span>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded
                     bg-amber-500 text-white hover:opacity-90 transition-opacity"
        >
          <Plus size={12} />
          Nueva
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading && (
          <div className="p-4 text-xs text-muted-foreground text-center">
            Cargando tareas...
          </div>
        )}

        {!isLoading && tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
            <Zap size={32} className="text-muted-foreground opacity-30" />
            <p className="text-sm text-muted-foreground">
              No hay tareas activas
            </p>
            <p className="text-xs text-muted-foreground opacity-60">
              Crea una tarea para que el agente la ejecute de forma autónoma
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="text-xs px-3 py-1.5 rounded border border-amber-500
                         text-amber-600 hover:bg-amber-500 hover:text-white transition-colors"
            >
              + Nueva tarea
            </button>
          </div>
        )}

        {sorted.map((task) => (
          <AgentTaskCard key={task.id} task={task} />
        ))}
      </div>

      {showCreate && (
        <AgentCreateTask onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}
