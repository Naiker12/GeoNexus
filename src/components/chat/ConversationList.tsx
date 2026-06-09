import { MessageSquarePlusIcon } from "lucide-react"
import { useEffect, useState } from "react"

import { listConversations } from "@/api/chat"
import { cn } from "@/lib/utils"
import type { Conversation } from "@/types/chat"

interface Props {
  projectId: string
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
}

export function ConversationList({ projectId, activeId, onSelect, onNew }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    listConversations(projectId)
      .then(setConversations)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [projectId])

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
        <button
          key={conv.id}
          onClick={() => onSelect(conv.id)}
          className={cn(
            "flex flex-col gap-0.5 rounded-md px-3 py-2 text-left text-sm",
            "hover:bg-muted transition-colors",
            activeId === conv.id && "bg-muted"
          )}
        >
          <span className="truncate font-medium">{conv.title || 'Sin título'}</span>
          <span className="text-[11px] text-muted-foreground">
            {conv.message_count ?? 0} mensajes
          </span>
        </button>
      ))}

      {!loading && conversations.length === 0 && (
        <div className="px-3 py-2 text-xs text-muted-foreground">
          Sin conversaciones. Crea una nueva.
        </div>
      )}
    </div>
  )
}
