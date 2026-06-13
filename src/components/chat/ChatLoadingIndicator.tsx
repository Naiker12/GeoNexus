export type ChatLoadingPhase =
  | "idle"
  | "classifying"
  | "searching"
  | "generating"
  | "extracting"
  | "done"

export function ChatLoadingIndicator(_props: { phase: ChatLoadingPhase }) {
  return null
}
