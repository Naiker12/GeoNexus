import { useState } from "react";
import { X } from "lucide-react";
import { useAgentTaskStore } from "../store/useAgentTaskStore";
import type { AgentTaskPriority } from "../types";

interface Props { onClose: () => void; }

export function AgentCreateTask({ onClose }: Props) {
  const createTask = useAgentTaskStore((s) => s.createTask);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState<AgentTaskPriority>("normal");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setIsCreating(true);
    try {
      await createTask({ title: title.trim(), notes: notes.trim() || undefined, priority });
      onClose();
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-lg
                      w-[400px] max-w-[90vw] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Nueva tarea del agente</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={14} />
          </button>
        </div>

        <input
          type="text"
          placeholder="¿Qué debe hacer el agente?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full text-sm bg-muted/30 border border-border
                     rounded px-3 py-2 text-foreground placeholder:text-muted-foreground
                     focus:outline-none focus:border-amber-500"
          autoFocus
        />

        <textarea
          placeholder="Notas adicionales, criterios de aceptación... (opcional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full text-sm bg-muted/30 border border-border
                     rounded px-3 py-2 text-foreground placeholder:text-muted-foreground
                     focus:outline-none focus:border-amber-500 resize-none"
        />

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Prioridad:</span>
          {(["low", "normal", "high", "urgent"] as AgentTaskPriority[]).map((p) => (
            <button
              key={p}
              onClick={() => setPriority(p)}
              className={`text-xs px-2 py-0.5 rounded capitalize transition-colors ${
                priority === p
                  ? "bg-amber-500 text-white"
                  : "border border-border text-muted-foreground hover:border-amber-300"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 text-muted-foreground
                       hover:text-foreground transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={!title.trim() || isCreating}
            className="text-xs px-4 py-1.5 rounded bg-amber-500
                       text-white hover:opacity-90 transition-opacity
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? "Creando..." : "Crear tarea"}
          </button>
        </div>
      </div>
    </div>
  );
}
