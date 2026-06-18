import * as React from "react"
import type {
  AgentMode,
  AgentStatus,
  AgentEvent,
  AgentPlan,
  FileNode,
  CodingAgentState,
  CleanupReport,
  PermissionRequest,
  LoadedProject,
} from "@/types/coding-agent"

type CodingAgentAction =
  | { type: "SET_MODE"; payload: AgentMode }
  | { type: "SET_STATUS"; payload: AgentStatus }
  | { type: "ADD_EVENT"; payload: AgentEvent }
  | { type: "UPDATE_EVENT"; payload: { id: string; changes: Partial<AgentEvent> } }
  | { type: "SET_FILES"; payload: FileNode[] }
  | { type: "ADD_FILE"; payload: FileNode }
  | { type: "UPDATE_FILE"; payload: { path: string; changes: Partial<FileNode> } }
  | { type: "SET_ACTIVE_FILE"; payload: FileNode | null }
  | { type: "SET_PREVIEW_URL"; payload: string | null }
  | { type: "SET_PLAN"; payload: string | null }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_CLEANUP_REPORT"; payload: CleanupReport | null }
  | { type: "SET_CURRENT_PLAN"; payload: AgentPlan | null }
  | { type: "APPROVE_PLAN" }
  | { type: "REJECT_PLAN" }
  | { type: "ADD_PERMISSION_REQUEST"; payload: PermissionRequest }
  | { type: "RESOLVE_PERMISSION_REQUEST"; payload: string }
  | { type: "SET_PROJECT_LOADED"; payload: LoadedProject | null }
  | { type: "RESET" }

const initialState: CodingAgentState = {
  mode: "chat",
  status: "idle",
  events: [],
  files: [],
  activeFile: null,
  previewUrl: null,
  plan: null,
  error: null,
  cleanupReport: null,
  currentPlan: null,
  pendingPermissions: [],
  loadedProject: null,
}

function codingAgentReducer(
  state: CodingAgentState,
  action: CodingAgentAction,
): CodingAgentState {
  switch (action.type) {
    case "SET_MODE":
      return { ...state, mode: action.payload }
    case "SET_STATUS":
      return { ...state, status: action.payload }
    case "ADD_EVENT":
      return { ...state, events: [...state.events, action.payload] }
    case "UPDATE_EVENT":
      return {
        ...state,
        events: state.events.map((e) =>
          e.id === action.payload.id
            ? { ...e, ...action.payload.changes }
            : e,
        ),
      }
    case "SET_FILES":
      return { ...state, files: action.payload }
    case "ADD_FILE":
      return { ...state, files: [...state.files, action.payload] }
    case "UPDATE_FILE":
      return {
        ...state,
        files: updateFileNode(state.files, action.payload.path, action.payload.changes),
      }
    case "SET_ACTIVE_FILE":
      return { ...state, activeFile: action.payload }
    case "SET_PREVIEW_URL":
      return { ...state, previewUrl: action.payload }
    case "SET_PLAN":
      return { ...state, plan: action.payload }
    case "SET_ERROR":
      return { ...state, error: action.payload }
    case "SET_CLEANUP_REPORT":
      return { ...state, cleanupReport: action.payload }
    case "SET_CURRENT_PLAN":
      return {
        ...state,
        currentPlan: action.payload,
        status: action.payload ? "planning_review" : state.status,
      }
    case "APPROVE_PLAN":
      return { ...state, currentPlan: null, status: "coding", pendingPermissions: [] }
    case "REJECT_PLAN":
      return { ...state, currentPlan: null, status: "idle", plan: null }
    case "ADD_PERMISSION_REQUEST":
      return {
        ...state,
        pendingPermissions: [...state.pendingPermissions, action.payload],
      }
    case "RESOLVE_PERMISSION_REQUEST":
      return {
        ...state,
        pendingPermissions: state.pendingPermissions.filter(
          (p) => p.id !== action.payload,
        ),
      }
    case "SET_PROJECT_LOADED":
      return { ...state, loadedProject: action.payload }
    case "RESET":
      return initialState
    default:
      return state
  }
}

function updateFileNode(
  nodes: FileNode[],
  path: string,
  changes: Partial<FileNode>,
): FileNode[] {
  return nodes.map((node) => {
    if (node.path === path) {
      return { ...node, ...changes }
    }
    if (node.children) {
      return {
        ...node,
        children: updateFileNode(node.children, path, changes),
      }
    }
    return node
  })
}

type CodingAgentContextType = {
  state: CodingAgentState
  dispatch: React.Dispatch<CodingAgentAction>
}

const CodingAgentContext = React.createContext<CodingAgentContextType | null>(
  null,
)

export function CodingAgentProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [state, dispatch] = React.useReducer(
    codingAgentReducer,
    initialState,
  )

  return (
    <CodingAgentContext.Provider value={{ state, dispatch }}>
      {children}
    </CodingAgentContext.Provider>
  )
}

export function useCodingAgent() {
  const ctx = React.useContext(CodingAgentContext)
  if (!ctx) {
    throw new Error("useCodingAgent must be used within a CodingAgentProvider")
  }
  return ctx
}
