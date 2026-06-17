import * as React from "react";
import type {
  FileNode,
  CodingStep,
  CodingAgentState,
  CodingPlan,
  ClarifyingQuestion,
  FileCreatedPayload,
} from "@/types/coding-agent";
import { isTauriAvailable } from "@/api/data";
import { listen } from "@tauri-apps/api/event";

interface CodingAgentContextType {
  state: CodingAgentState;
  toggleCodingMode: () => void;
  resetAgentSession: () => void;
  startClarification: (questions: ClarifyingQuestion[]) => void;
  setPlan: (plan: CodingPlan) => void;
  confirmPlan: () => void;
  addStep: (step: Omit<CodingStep, "id">) => void;
  updateStep: (id: string, updates: Partial<CodingStep>) => void;
  addFile: (file: FileNode) => void;
  updateFile: (id: string, updates: Partial<FileNode>) => void;
  /** Setter funcional del árbol — evita race conditions con eventos Tauri en ráfaga. */
  updateFileTree: (updater: (current: FileNode[]) => FileNode[]) => void;
  setPreviewUrl: (url: string | null) => void;
  reset: () => void;
  setPhase: (phase: CodingAgentState["phase"]) => void;
  setActiveFile: (file: FileNode | null) => void;
}

const initialState: CodingAgentState = {
  isActive: false,
  phase: "idle",
  steps: [],
  files: [],
  plan: null,
  previewUrl: null,
  activeFile: null,
  clarifyingQuestions: [],
};

/** Inserta o actualiza un nodo en el árbol de archivos de forma inmutable. */
function upsertFileNode(tree: FileNode[], payload: FileCreatedPayload): FileNode[] {
  const parts = payload.path.split("/");
  const cloned = [...tree];
  let currentLevel = cloned;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const isLeaf = i === parts.length - 1;
    const nodePath = parts.slice(0, i + 1).join("/");
    const existingIdx = currentLevel.findIndex((n) => n.name === part);

    if (isLeaf) {
      if (existingIdx >= 0) {
        currentLevel[existingIdx] = {
          ...currentLevel[existingIdx],
          content: payload.content,
          status: "done",
        };
      } else {
        currentLevel.push({
          id: `file-${nodePath}-${Date.now()}`,
          name: part,
          path: nodePath,
          type: "file",
          status: "done",
          content: payload.content,
        });
      }
    } else {
      if (existingIdx >= 0) {
        const dir = { ...currentLevel[existingIdx] };
        dir.children = dir.children ? [...dir.children] : [];
        currentLevel[existingIdx] = dir;
        currentLevel = dir.children;
      } else {
        const newDir: FileNode = {
          id: `dir-${nodePath}-${Date.now()}`,
          name: part,
          path: nodePath,
          type: "folder",
          status: "done",
          children: [],
        };
        currentLevel.push(newDir);
        currentLevel = newDir.children!;
      }
    }
  }

  return cloned;
}

const CodingAgentContext = React.createContext<CodingAgentContextType | null>(null);

export function CodingAgentProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<CodingAgentState>(initialState);

  const toggleCodingMode = React.useCallback(() => {
    setState((prev) => ({ ...prev, isActive: !prev.isActive }));
  }, []);

  const resetAgentSession = React.useCallback(() => {
    setState(initialState);
  }, []);

  const reset = resetAgentSession;

  const setPhase = React.useCallback((phase: CodingAgentState["phase"]) => {
    setState((prev) => ({ ...prev, phase }));
  }, []);

  const startClarification = React.useCallback((questions: ClarifyingQuestion[]) => {
    setState((prev) => ({ ...prev, phase: "clarifying", clarifyingQuestions: questions }));
  }, []);

  const setPlan = React.useCallback((plan: CodingPlan) => {
    setState((prev) => ({ ...prev, plan, phase: "planning" }));
  }, []);

  const confirmPlan = React.useCallback(() => {
    setState((prev) => ({ ...prev, phase: "building" }));
  }, []);

  const addStep = React.useCallback((step: Omit<CodingStep, "id">) => {
    setState((prev) => ({
      ...prev,
      steps: [...prev.steps, { ...step, id: crypto.randomUUID() }],
    }));
  }, []);

  const updateStep = React.useCallback((id: string, updates: Partial<CodingStep>) => {
    setState((prev) => ({
      ...prev,
      steps: prev.steps.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    }));
  }, []);

  const addFile = React.useCallback((file: FileNode) => {
    setState((prev) => ({ ...prev, files: [...prev.files, file] }));
  }, []);

  const updateFile = React.useCallback((id: string, updates: Partial<FileNode>) => {
    setState((prev) => ({
      ...prev,
      files: prev.files.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    }));
  }, []);

  const updateFileTree = React.useCallback(
    (updater: (current: FileNode[]) => FileNode[]) => {
      setState((prev) => ({ ...prev, files: updater(prev.files) }));
    },
    []
  );

  const setPreviewUrl = React.useCallback((url: string | null) => {
    setState((prev) => ({
      ...prev,
      previewUrl: url,
      phase: url ? "preview" : prev.phase,
    }));
  }, []);

  const setActiveFile = React.useCallback((file: FileNode | null) => {
    setState((prev) => ({ ...prev, activeFile: file }));
  }, []);

  React.useEffect(() => {
    if (!isTauriAvailable()) return;

    let unlistenPreviewReady: (() => void) | null = null;
    let unlistenFileCreated: (() => void) | null = null;

    (async () => {
      unlistenPreviewReady = await listen<{ url: string }>(
        "agent:preview_ready",
        (event) => setPreviewUrl(event.payload.url)
      );

      unlistenFileCreated = await listen<FileCreatedPayload>(
        "coding:file_created",
        (event) => {
          const payload = event.payload;
          if (!payload?.path) return;
          updateFileTree((current) => upsertFileNode(current, payload));
        }
      );
    })();

    return () => {
      unlistenPreviewReady?.();
      unlistenFileCreated?.();
    };
  }, [setPreviewUrl, updateFileTree]);

  const value = React.useMemo(
    () => ({
      state,
      toggleCodingMode,
      resetAgentSession,
      setPhase,
      startClarification,
      setPlan,
      confirmPlan,
      addStep,
      updateStep,
      addFile,
      updateFile,
      updateFileTree,
      setPreviewUrl,
      setActiveFile,
      reset,
    }),
    [
      state,
      toggleCodingMode,
      resetAgentSession,
      setPhase,
      startClarification,
      setPlan,
      confirmPlan,
      addStep,
      updateStep,
      addFile,
      updateFile,
      updateFileTree,
      setPreviewUrl,
      setActiveFile,
      reset,
    ]
  );

  return (
    <CodingAgentContext.Provider value={value}>
      {children}
    </CodingAgentContext.Provider>
  );
}

export function useCodingAgent() {
  const context = React.useContext(CodingAgentContext);
  if (!context) {
    throw new Error("useCodingAgent must be used within a CodingAgentProvider");
  }
  return context;
}