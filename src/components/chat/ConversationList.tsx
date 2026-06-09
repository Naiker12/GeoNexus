import { MessageSquarePlusIcon, Trash2Icon } from "lucide-react"
import { useEffect, useState } from "react"

import { deleteConversation, listConversations } from "@/api/chat"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { cn } from "@/lib/utils"
import type { Conversation } from "@/types/chat"

interface Props {
  projectId: string
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete?: (id: string) => void
}

export function ConversationList({ projectId, activeId, onSelect, onNew, onDelete }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null)

  function load() {
    setLoading(true)
    listConversations(projectId)
      .then(setConversations)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(load, [projectId])

  async function handleDelete(conv: Conversation) {
    try {
      await deleteConversation(conv.id)
      setConversations((prev) => prev.filter((c) => c.id !== conv.id))
      if (conv.id === activeId) onDelete?.(conv.id)
    } catch (err) {
      console.error("Error al eliminar conversacion:", err)
    }
  }

  return (
    <div className="flex flex-col gap-1 p-2">
      <button
        onClick={onNew}
        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm
                   bg-primary/10 hover:bg-primary/20 text-primary font-medium"
      >
        <MessageSquarePlusIcon className="size-4" />
        Nueva conversación
      </button>

      {loading && (
        <div className="px-3 py-2 text-xs text-muted-foreground">Cargando...</div>
      )}

      {conversations.map(conv => (
        <div
          key={conv.id}
          className={cn(
            "group flex items-center gap-1 rounded-md hover:bg-muted transition-colors",
            activeId === conv.id && "bg-muted"
          )}
        >
          <button
            onClick={() => onSelect(conv.id)}
            className="flex min-w-0 flex-1 flex-col gap-0.5 px-3 py-2 text-left text-sm"
          >
            <span className="truncate font-medium">{conv.title || 'Sin título'}</span>
            <span className="text-[11px] text-muted-foreground">
              {conv.message_count ?? 0} mensajes
            </span>
          </button>
          <button
            onClick={() => setDeleteTarget(conv)}
            className="mr-1 flex size-7 shrink-0 items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            aria-label={`Eliminar ${conv.title || 'conversación'}`}
          >
            <Trash2Icon className="size-3.5" />
          </button>
        </div>
      ))}

      {!loading && conversations.length === 0 && (
        <div className="px-3 py-2 text-xs text-muted-foreground">
          Sin conversaciones. Crea una nueva.
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title="Eliminar conversación"
        description={
          <>
            ¿Eliminar <strong>{deleteTarget?.title || 'esta conversación'}</strong>? Se borrarán
            todos los mensajes. Esta acción no se puede deshacer.
          </>
        }
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget)
        }}
      />
    </div>
  )
}
