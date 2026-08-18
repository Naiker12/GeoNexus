import { isTauri } from "@/api/invoke"
import { Button } from "@/components/ui/Button"
import { useEffect, useRef, useState } from "react"

interface SkillOffering {
  skill_name: string
  conversation_id: string
  auto_generated: boolean
}

export function SkillOfferingBanner() {
  const [offering, setOffering] = useState<SkillOffering | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const unlistenRef = useRef<() => void>()

  useEffect(() => {
    if (!isTauri()) return

    import("@tauri-apps/api/event")
      .then(({ listen }) => {
        listen<{
          type: string
          skill_name: string
          conversation_id: string
          auto_generated: boolean
        }>("chat:stream_event", (event) => {
          if (event?.payload?.type === "skill_created" && event?.payload?.auto_generated) {
            setOffering({
              skill_name: event.payload.skill_name,
              conversation_id: event.payload.conversation_id,
              auto_generated: true,
            })
            setDismissed(false)
          }
        })
          .then((unlisten) => {
            unlistenRef.current = unlisten
          })
          .catch(() => {})
      })
      .catch(() => {})

    return () => {
      unlistenRef.current?.()
    }
  }, [])

  if (!offering || dismissed) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-2xl border border-primary/30 bg-background/95 p-4 shadow-xl backdrop-blur-md animate-in fade-in">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0 text-lg">⚡</div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground">Nuevo skill generado</p>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground line-clamp-2">
            Se creó automáticamente "{offering.skill_name}" desde la conversación.
          </p>
          <div className="mt-2 flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                window.location.hash = "#skills"
                setDismissed(true)
              }}
              className="rounded-xl text-xs h-7"
            >
              Ver skill
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDismissed(true)}
              className="rounded-xl text-xs h-7"
            >
              Descartar
            </Button>
          </div>
        </div>
        <button
          className="flex-shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
          onClick={() => setDismissed(true)}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
