import * as React from "react";
import type {
  FileNode,
  CodingStep,
  CodingAgentState,
  CodingPlan,
  ClarifyingQuestion,
} from "@/types/coding-agent";

interface CodingAgentContextType {
  state: CodingAgentState;
  toggleCodingMode: () => void;
  startClarification: (questions: ClarifyingQuestion[]) => void;
  setPlan: (plan: CodingPlan) => void;
  confirmPlan: () => void;
  addStep: (step: Omit<CodingStep, "id">) => void;
  updateStep: (id: string, updates: Partial<CodingStep>) => void;
  addFile: (file: FileNode) => void;
  updateFile: (id: string, updates: Partial<FileNode>) => void;
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

const CodingAgentContext = React.createContext<CodingAgentContextType | null>(null);

export function CodingAgentProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<CodingAgentState>(initialState);

  const toggleCodingMode = React.useCallback(() => {
    setState((prev) => {
      const newIsActive = !prev.isActive;
      if (!newIsActive) {
        return initialState;
      }
      return { ...prev, isActive: newIsActive };
    });
  }, []);

  const setPhase = React.useCallback((phase: CodingAgentState["phase"]) => {
    setState((prev) => ({ ...prev, phase }));
  }, []);

  const startClarification = React.useCallback((questions: ClarifyingQuestion[]) => {
    setState((prev) => ({
      ...prev,
      phase: "clarifying",
      clarifyingQuestions: questions,
    }));
  }, []);

  const setPlan = React.useCallback((plan: CodingPlan) => {
    setState((prev) => ({ ...prev, plan, phase: "planning" }));
  }, []);

  const confirmPlan = React.useCallback(() => {
    setState((prev) => ({ ...prev, phase: "building" }));
  }, []);

  const addStep = React.useCallback(
    (step: Omit<CodingStep, "id">) => {
      setState((prev) => ({
        ...prev,
        steps: [...prev.steps, { ...step, id: crypto.randomUUID() }],
      }));
    },
    []
  );

  const updateStep = React.useCallback(
    (id: string, updates: Partial<CodingStep>) => {
      setState((prev) => ({
        ...prev,
        steps: prev.steps.map((step) =>
          step.id === id ? { ...step, ...updates } : step
        ),
      }));
    },
    []
  );

  const addFile = React.useCallback((file: FileNode) => {
    setState((prev) => ({
      ...prev,
      files: [...prev.files, file],
    }));
  }, []);

  const updateFile = React.useCallback(
    (id: string, updates: Partial<FileNode>) => {
      setState((prev) => ({
        ...prev,
        files: prev.files.map((file) =>
          file.id === id ? { ...file, ...updates } : file
        ),
      }));
    },
    []
  );

  const setPreviewUrl = React.useCallback((url: string | null) => {
    setState((prev) => ({ ...prev, previewUrl: url, phase: url ? "preview" : prev.phase }));
  }, []);

  const setActiveFile = React.useCallback((file: FileNode | null) => {
    setState((prev) => ({ ...prev, activeFile: file }));
  }, []);

  const reset = React.useCallback(() => {
    setState(initialState);
  }, []);

  const value = React.useMemo(
    () => ({
      state,
      toggleCodingMode,
      setPhase,
      startClarification,
      setPlan,
      confirmPlan,
      addStep,
      updateStep,
      addFile,
      updateFile,
      setPreviewUrl,
      setActiveFile,
      reset,
    }),
    [
      state,
      toggleCodingMode,
      setPhase,
      startClarification,
      setPlan,
      confirmPlan,
      addStep,
      updateStep,
      addFile,
      updateFile,
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