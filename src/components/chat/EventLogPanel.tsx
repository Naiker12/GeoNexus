import React, { useState, useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import type { AgentTraceEvent } from '@/types/chat';

interface RawLogEntry {
  timestamp: string;
  type: string;
  data: string;
}

interface EventLogPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EventLogPanel({ isOpen, onClose }: EventLogPanelProps) {
  const [log, setLog] = useState<RawLogEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unlistenPromise = listen<AgentTraceEvent>('agent:event', (e) => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });

      setLog(prev => [
        ...prev,
        {
          timestamp: timeStr,
          type: e.payload.type || 'unknown',
          data: JSON.stringify(e.payload, null, 2)
        }
      ]);
    });

    return () => {
      unlistenPromise.then(unlisten => unlisten());
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current && isOpen) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [log, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-0 right-0 w-[520px] h-[400px] bg-[#0a0a0f] border border-zinc-800 rounded-tl-xl shadow-2xl z-50 flex flex-col font-mono">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <span className="text-zinc-400 text-sm font-semibold">📋 Log de Eventos</span>
          <span className="text-zinc-600 text-xs">
            {log.length} eventos
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLog([])}
            className="text-zinc-500 hover:text-zinc-300 text-xs px-2 py-1 rounded hover:bg-zinc-800 transition-colors"
          >
            Limpiar
          </button>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            ✕
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-2"
      >
        {log.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600">
            <span className="text-2xl mb-2">🔍</span>
            <p className="text-xs">Esperando actividad del agente...</p>
          </div>
        ) : (
          log.map((entry, i) => (
            <div
              key={i}
              className="group hover:bg-zinc-900/60 p-2 rounded border border-zinc-800/50 hover:border-zinc-700 transition-all"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-zinc-500 text-xs shrink-0">
                  {entry.timestamp}
                </span>
                <span className="text-zinc-400 text-xs font-semibold uppercase tracking-wide shrink-0">
                  [{entry.type}]
                </span>
              </div>
              <pre className="text-[10px] text-zinc-500 leading-relaxed whitespace-pre-wrap break-all">
                {entry.data}
              </pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
