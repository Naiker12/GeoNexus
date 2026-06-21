import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useAgentTaskStore } from "../store/useAgentTaskStore";
import type { AgentTaskEvent } from "../types";

export function useAgentTaskEvents() {
  const applyEvent = useAgentTaskStore((s) => s.applyEvent);
  const loadTasks = useAgentTaskStore((s) => s.loadTasks);

  useEffect(() => {
    loadTasks();

    const unlisten = listen<AgentTaskEvent>(
      "agent:task",
      (e) => applyEvent(e.payload),
      { target: { kind: "Any" } }
    );

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);
}
