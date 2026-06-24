import * as React from "react"

import { ConversationMemoryBadge } from "@/components/chat/ConversationMemoryBadge"
import { DropZone } from "@/components/chat/DropZone"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupControl,
} from "@/components/ui/input-group"
import { useComposerState } from "@/components/chat/composer/useComposerState"
import { ComposerInput } from "@/components/chat/composer/ComposerInput"
import { ComposerToolbar, ComposerActions } from "@/components/chat/composer/ComposerToolbar"
import type { SkillInfo, SessionSummary, FileAttachment } from "@/types/chat"
import type { MentionSource } from "@/types/chat"
import type { AgentSourceType } from "@/types/agents"
import type { ReasoningEffort } from "@/features/chat/ReasoningToggle"
import { useDraftsStore } from "@/stores/draftsStore"

export type ChatComposerProps = {
  value: string
  onValueChange: (value: string) => void
  conversationId?: string
  activeProvider: { provider: string; model: string; endpoint: string } | null
  error: string | null
  pending: boolean
  onSubmit: (content: string, mentions?: { assetIds: string[]; connectorIds: string[]; mcpServerIds: string[]; nodeIds: string[]; agentSources?: AgentSourceType[]; skillNames?: string[] }, attachments?: FileAttachment[]) => void
  onStop?: () => void
  onToggleContext: () => void
  contextActive: boolean
  webSearchEnabled: boolean
  onToggleWebSearch: () => void
  onMentionSelect?: (source: MentionSource) => void
  onNewChat?: () => void
  onClearChat?: () => void
  onExportChat?: () => void
  onReindex?: () => void
  activeSkills?: SkillInfo[]
  onRemoveSkill?: (id: string) => void
  sessionSummary?: SessionSummary | null
  reasoningEffort?: ReasoningEffort
  onReasoningEffortChange?: (v: ReasoningEffort) => void
}

export function ChatComposer(props: ChatComposerProps) {
  const {
    value, onValueChange, activeProvider, error, pending,
    onSubmit, onStop, onToggleContext, contextActive,
    webSearchEnabled, onToggleWebSearch,
    activeSkills, onRemoveSkill, sessionSummary,
    reasoningEffort, onReasoningEffortChange,
  } = props

  const { conversationId } = props
  const prevConversationId = React.useRef(conversationId)
  const draftsStore = useDraftsStore()

  React.useEffect(() => {
    if (conversationId && conversationId !== prevConversationId.current) {
      if (prevConversationId.current) {
        draftsStore.setDraft(prevConversationId.current, value)
      }
      const draft = draftsStore.getDraft(conversationId)
      if (draft && draft !== value) {
        props.onValueChange(draft)
      }
      prevConversationId.current = conversationId
    }
  }, [conversationId])

  React.useEffect(() => {
    if (conversationId) {
      const timer = setTimeout(() => {
        draftsStore.setDraft(conversationId, value)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [value, conversationId])

  const {
    chips, selectedPickerIndex, anchorPosition,
    trigger, pickerItems, rawSources,
    handleSubmit, handleComposerChange, handleKeyDown,
    handleFileChange, handleDrop,
    removeChip, closePicker,
    setCursorPos, setSelectedPickerIndex, setAnchorPosition,
    fileInputRef, textareaRef, refreshSources,
  } = useComposerState(props)

  return (
    <div className="mx-auto w-full max-w-3xl shrink-0 border-t border-border bg-background px-4 py-3 sm:px-5">
      {sessionSummary && <ConversationMemoryBadge summary={sessionSummary} />}

      <DropZone onDrop={handleDrop}>
        <form
          className="rounded-2xl border border-border/80 bg-card/95 p-2 text-card-foreground shadow-xs"
          onSubmit={handleSubmit}
        >
          {activeSkills && activeSkills.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5 px-2">
              {activeSkills.map(skill => (
                <span
                  key={skill.id}
                  className="inline-flex items-center gap-1 rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary"
                >
                  {skill.name}
                  <button
                    type="button"
                    onClick={() => onRemoveSkill?.(skill.id)}
                    className="hover:text-destructive ml-0.5"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}

          <InputGroup className="min-h-12 items-center rounded-xl bg-background/95 py-1">
            <InputGroupAddon className="items-center">
              <ComposerActions.Left
                pending={pending}
                onAttachFiles={() => fileInputRef.current?.click()}
                connectors={rawSources?.connectors ?? []}
                mcpServers={rawSources?.mcp_servers ?? []}
                refreshSources={refreshSources}
                webSearchEnabled={webSearchEnabled}
                onToggleWebSearch={onToggleWebSearch}
              />
            </InputGroupAddon>
            <InputGroupControl className="relative flex items-center">
              <ComposerInput
                value={value}
                textareaRef={textareaRef}
                chips={chips}
                onRemoveChip={removeChip}
                trigger={trigger}
                pickerItems={pickerItems}
                selectedPickerIndex={selectedPickerIndex}
                anchorPosition={anchorPosition}
                onChange={handleComposerChange}
                onKeyDown={handleKeyDown}
              />
            </InputGroupControl>
            <InputGroupAddon className="items-center">
              <ComposerActions.Right
                pending={pending}
                value={value}
                activeProvider={activeProvider}
                onStop={onStop}
                onTranscription={(text) => {
                  onValueChange(value ? `${value} ${text}` : text)
                }}
              />
            </InputGroupAddon>
          </InputGroup>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          <ComposerToolbar
            value={value}
            pending={pending}
            activeProvider={activeProvider}
            contextActive={contextActive}
            webSearchEnabled={webSearchEnabled}
            onToggleContext={onToggleContext}
            onToggleWebSearch={onToggleWebSearch}
            onStop={onStop}
            onTranscription={(text) => {
              onValueChange(value ? `${value} ${text}` : text)
            }}
            onAttachFiles={() => fileInputRef.current?.click()}
            connectors={rawSources?.connectors ?? []}
            mcpServers={rawSources?.mcp_servers ?? []}
            refreshSources={refreshSources}
            reasoningEffort={reasoningEffort}
            onReasoningEffortChange={onReasoningEffortChange}
          />

          {error ? (
            <p className="mt-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          ) : null}
        </form>
      </DropZone>
    </div>
  )
}
