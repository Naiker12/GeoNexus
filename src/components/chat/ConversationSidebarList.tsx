import { MessageSquare, Trash2Icon } from "lucide-react"
import { useEffect, useState } from "react"

import { deleteConversation, listConversations } from "@/api/chat"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { cn } from "@/lib/utils"
import type { Conversation } from "@/types/chat"

interface Props {
  projectId: string
  activeId: string | null
  collapsed: boolean
  onSelect: (id: string) => void
  onDelete?: (id: string) => void
}

export function ConversationSidebarList({ projectId, activeId, collapsed, onSelect, onDelete }: Props) {
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

  function relativeTime(ts: number): string {
    const diff = Date.now() - ts * 1000
    const mins  = Math.floor(diff / 60_000)
    const hours = Math.floor(diff / 3_600_000)
    const days  = Math.floor(diff / 86_400_000)
    if (mins < 1)   return "ahora"
    if (mins < 60)  return `hace ${mins}m`
    if (hours < 24) return `hace ${hours}h`
    if (days === 1) return "ayer"
    if (days < 7)   return ["dom","lun","mar","mié","jue","vie","sáb"][new Date(ts*1000).getDay()]
    return new Date(ts * 1000).toLocaleDateString("es-CO", { day:"numeric", month:"short" })
  }

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-0.5">
        {conversations.map(conv => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={cn(
              "w-[30px] h-[30px] rounded-lg flex items-center justify-center",
              "text-muted-foreground hover:bg-background hover:text-foreground",
              "transition-colors mb-0.5",
              conv.id === activeId && "bg-background text-foreground"
            )}
            title={conv.title ?? "Sin título"}
          >
            <MessageSquare size={13} />
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5">
      {loading && (
        <div className="px-3 py-2 text-[11px] text-muted-foreground">Cargando...</div>
      )}

      {conversations.map(conv => (
        <div
          key={conv.id}
          className={cn(
            "group flex items-center gap-1 rounded-lg hover:bg-background transition-colors",
            activeId === conv.id && "bg-background"
          )}
        >
          <button
            onClick={() => onSelect(conv.id)}
            className="flex min-w-0 flex-1 flex-col items-start px-2.5 py-2 text-left"
          >
            <span className="text-[12px] font-medium text-foreground truncate w-full">
              {conv.title || "Sin título"}
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5">
              {conv.message_count ?? 0} mensajes · {relativeTime(conv.updated_at)}
            </span>
          </button>
          <button
            onClick={() => setDeleteTarget(conv)}
            className="mr-1 flex size-6 shrink-0 items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            aria-label={`Eliminar ${conv.title || 'conversación'}`}
          >
            <Trash2Icon className="size-3" />
          </button>
        </div>
      ))}

      {!loading && conversations.length === 0 && (
        <div className="px-3 py-2 text-[11px] text-muted-foreground">
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
