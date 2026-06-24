import * as React from "react"
import {
  GlobeIcon, Loader2, SendIcon, SparklesIcon,
  StopCircleIcon, XIcon,
} from "lucide-react"

import { Button } from "@/components/ui/Button"
import { ToolMenu } from "@/components/chat/ToolMenu"
import { AudioRecorder } from "@/components/chat/AudioRecorder"
import { ReasoningToggle, type ReasoningEffort } from "@/features/chat/ReasoningToggle"
import type { MentionableSourceItem } from "@/types/chat"

type ComposerToolbarProps = {
  value: string
  pending: boolean
  activeProvider: { provider: string; model: string; endpoint: string } | null
  contextActive: boolean
  webSearchEnabled: boolean
  onToggleContext: () => void
  onToggleWebSearch: () => void
  onStop?: () => void
  onTranscription: (text: string) => void
  onAttachFiles: () => void
  connectors: MentionableSourceItem[]
  mcpServers: MentionableSourceItem[]
  refreshSources: () => void
  reasoningEffort?: ReasoningEffort
  onReasoningEffortChange?: (v: ReasoningEffort) => void
}

function ComposerToolbar({
  contextActive,
  webSearchEnabled,
  onToggleContext,
  onToggleWebSearch,
  pending,
  reasoningEffort,
  onReasoningEffortChange,
}: ComposerToolbarProps) {
  return (
    <>
      <div className="mt-2 flex flex-wrap gap-1.5 px-2">
        <Button
          type="button"
          variant={contextActive ? "default" : "outline"}
          size="sm"
          onClick={onToggleContext}
        >
          <SparklesIcon className="size-4" />
          {contextActive ? "Contexto activo" : "Usar contexto GIS"}
        </Button>

        {reasoningEffort != null && onReasoningEffortChange && (
          <ReasoningToggle
            value={reasoningEffort}
            onChange={onReasoningEffortChange}
          />
        )}
      </div>

      {webSearchEnabled && (
        <div className="mt-2 flex items-center gap-1.5 px-2">
          <GlobeIcon className="size-3 text-emerald-500" />
          <span className="text-[11px] text-emerald-500 font-medium">
            Busqueda web activa
          </span>
          <button
            type="button"
            onClick={onToggleWebSearch}
            className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Desactivar busqueda web"
          >
            <XIcon className="size-3" />
          </button>
        </div>
      )}

      {pending && webSearchEnabled && (
        <div className="mt-2 flex items-center gap-1.5 px-2">
          <Loader2 className="size-3 text-blue-500 animate-spin" />
          <span className="text-[11px] text-blue-500 font-medium">
            Deep Research activo...
          </span>
        </div>
      )}
    </>
  )
}

function LeftActions({
  pending,
  onAttachFiles,
  connectors,
  mcpServers,
  refreshSources,
  webSearchEnabled,
  onToggleWebSearch,
}: {
  pending: boolean
  onAttachFiles: () => void
  connectors: MentionableSourceItem[]
  mcpServers: MentionableSourceItem[]
  refreshSources: () => void
  webSearchEnabled: boolean
  onToggleWebSearch: () => void
}) {
  return (
    <ToolMenu
      webSearchEnabled={webSearchEnabled}
      onToggleWebSearch={onToggleWebSearch}
      connectors={connectors}
      mcpServers={mcpServers}
      refreshSources={refreshSources}
      onAttachFiles={onAttachFiles}
    />
  )
}

function RightActions({
  pending,
  value,
  activeProvider,
  onStop,
  onTranscription,
}: {
  pending: boolean
  value: string
  activeProvider: { provider: string; model: string; endpoint: string } | null
  onStop?: () => void
  onTranscription: (text: string) => void
}) {
  return (
    <>
      <AudioRecorder
        onTranscription={onTranscription}
        disabled={pending}
      />

      {pending ? (
        <Button
          type="button"
          size="icon"
          className="rounded-xl bg-red-500 hover:bg-red-600 text-white"
          aria-label="Detener análisis"
          onClick={onStop}
        >
          <StopCircleIcon className="size-4" />
        </Button>
      ) : (
        <Button
          type="submit"
          size="icon"
          className="rounded-xl"
          aria-label="Enviar mensaje"
          disabled={!value.trim() || !activeProvider}
        >
          <SendIcon className="size-4" />
        </Button>
      )}
    </>
  )
}

const ComposerActions = {
  Left: LeftActions,
  Right: RightActions,
}

export { ComposerToolbar, ComposerActions }
export type { ComposerToolbarProps }
