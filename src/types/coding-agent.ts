export type CodingPhase =
  | "idle"
  | "clarifying"
  | "planning"
  | "building"
  | "preview"
  | "error";

export type StepStatus = "pending" | "active" | "done" | "error";

export interface CodingStep {
  id: string;
  label: string;
  status: StepStatus;
  duration?: number;
  details?: string[];
}

export interface FileNode {
  id: string;
  name: string;
  type: "file" | "folder";
  status: "pending" | "creating" | "done" | "error";
  content?: string;
  language?: string;
  children?: FileNode[];
  path: string;
}

export interface CodingPlan {
  stack: string;
  files: string[];
  estimatedTime: string;
  description: string;
}

export interface ClarifyingQuestion {
  id: string;
  question: string;
  options: string[];
  answered: boolean;
  answer?: string;
}

export interface CodingAgentState {
  isActive: boolean;
  phase: CodingPhase;
  steps: CodingStep[];
  files: FileNode[];
  plan: CodingPlan | null;
  previewUrl: string | null;
  activeFile: FileNode | null;
  clarifyingQuestions: ClarifyingQuestion[];
}
