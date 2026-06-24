import { ArchiveIcon, ArchiveRestoreIcon, MessageSquare, SearchIcon, Trash2Icon } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { archiveConversation, unarchiveConversation, deleteConversation, listConversations, listArchivedConversations, searchConversations } from "@/api/chat"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { cn } from "@/lib/utils"
import type { Conversation, ConversationSearchResult } from "@/types/chat"

const SEARCH_DEBOUNCE_MS = 300

interface Props {
  projectId: string
  activeId: string | null
  collapsed: boolean
  onSelect: (id: string) => void
  onDelete?: (id: string) => void
}

type Tab = "active" | "archived"

export function ConversationSidebarList({ projectId, activeId, collapsed, onSelect, onDelete }: Props) {
  const [activeConvs, setActiveConvs] = useState<Conversation[]>([])
  const [archivedConvs, setArchivedConvs] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null)
  const [tab, setTab] = useState<Tab>("active")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<ConversationSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout>>()

  function load() {
    setLoading(true)
    Promise.all([
      listConversations(projectId),
      listArchivedConversations(projectId),
    ])
      .then(([active, archived]) => {
        setActiveConvs(active)
        setArchivedConvs(archived)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(load, [projectId])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      try {
        const results = await searchConversations(projectId, searchQuery)
        setSearchResults(results)
      } catch {
        setSearchResults([])
      }
      setSearching(false)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(searchTimer.current)
  }, [searchQuery, projectId])

  async function handleArchive(conv: Conversation) {
    try {
      await archiveConversation(conv.id)
      setActiveConvs((prev) => prev.filter((c) => c.id !== conv.id))
      setArchivedConvs((prev) => [{ ...conv, archived_at: Date.now() / 1000 }, ...prev])
    } catch (err) {
      console.error("Error al archivar:", err)
    }
  }

  async function handleUnarchive(conv: Conversation) {
    try {
      await unarchiveConversation(conv.id)
      setArchivedConvs((prev) => prev.filter((c) => c.id !== conv.id))
      setActiveConvs((prev) => [{ ...conv, archived_at: null }, ...prev])
    } catch (err) {
      console.error("Error al desarchivar:", err)
    }
  }

  async function handleDelete(conv: Conversation) {
    try {
      await deleteConversation(conv.id)
      setActiveConvs((prev) => prev.filter((c) => c.id !== conv.id))
      setArchivedConvs((prev) => prev.filter((c) => c.id !== conv.id))
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

  const displayConvs = tab === "active" ? activeConvs : archivedConvs

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-0.5">
        {displayConvs.map(conv => (
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
      {/* Search */}
      <div className="relative px-1.5 pb-1.5">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar conversaciones..."
          className="w-full rounded-md border border-border bg-background py-1.5 pl-7 pr-2 text-[11px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {searching && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 size-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 px-1.5 pb-1">
        <button
          onClick={() => setTab("active")}
          className={cn(
            "flex-1 rounded-md py-1 text-[10px] font-medium transition-colors",
            tab === "active" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Activas ({activeConvs.length})
        </button>
        <button
          onClick={() => setTab("archived")}
          className={cn(
            "flex-1 rounded-md py-1 text-[10px] font-medium transition-colors",
            tab === "archived" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Archivadas ({archivedConvs.length})
        </button>
      </div>

      {loading && (
        <div className="px-3 py-2 text-[11px] text-muted-foreground">Cargando...</div>
      )}

      {/* Search results */}
      {searchQuery.trim() && !searching && searchResults.length > 0 && (
        <div className="px-1.5 pb-1">
          <p className="px-2 py-1 text-[10px] font-semibold uppercase text-muted-foreground">Resultados</p>
          {searchResults.map(r => (
            <button
              key={r.conversation_id}
              onClick={() => { onSelect(r.conversation_id); setSearchQuery("") }}
              className="flex w-full flex-col items-start rounded-lg px-2.5 py-2 text-left hover:bg-background transition-colors"
            >
              <span className="text-[12px] font-medium text-foreground truncate w-full">
                {r.title || "Sin título"}
              </span>
              <span
                className="mt-0.5 text-[10px] text-muted-foreground line-clamp-1"
                dangerouslySetInnerHTML={{ __html: r.snippet }}
              />
            </button>
          ))}
        </div>
      )}

      {searchQuery.trim() && !searching && searchResults.length === 0 && !loading && (
        <div className="px-3 py-2 text-[11px] text-muted-foreground">Sin resultados</div>
      )}

      {/* Conversation list (only when no search active) */}
      {!searchQuery.trim() && displayConvs.map(conv => (
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
          {tab === "active" ? (
            <button
              onClick={() => handleArchive(conv)}
              className="mr-1 flex size-6 shrink-0 items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground hover:bg-accent"
              aria-label={`Archivar ${conv.title || 'conversación'}`}
              title="Archivar"
            >
              <ArchiveIcon className="size-3" />
            </button>
          ) : (
            <button
              onClick={() => handleUnarchive(conv)}
              className="mr-1 flex size-6 shrink-0 items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground hover:bg-accent"
              aria-label={`Desarchivar ${conv.title || 'conversación'}`}
              title="Restaurar"
            >
              <ArchiveRestoreIcon className="size-3" />
            </button>
          )}
          <button
            onClick={() => setDeleteTarget(conv)}
            className="mr-1 flex size-6 shrink-0 items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            aria-label={`Eliminar ${conv.title || 'conversación'}`}
          >
            <Trash2Icon className="size-3" />
          </button>
        </div>
      ))}

      {!loading && !searchQuery.trim() && displayConvs.length === 0 && (
        <div className="px-3 py-2 text-[11px] text-muted-foreground">
          {tab === "active" ? "Sin conversaciones. Crea una nueva." : "No hay conversaciones archivadas."}
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
