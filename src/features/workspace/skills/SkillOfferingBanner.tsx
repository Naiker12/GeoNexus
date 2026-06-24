import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/Button"

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
    import("@tauri-apps/api/event").then(({ listen }) => {
      listen<{ type: string; skill_name: string; conversation_id: string; auto_generated: boolean }>(
        "chat:stream_event",
        (event) => {
          if (event.payload.type === "skill_created" && event.payload.auto_generated) {
            setOffering({
              skill_name: event.payload.skill_name,
              conversation_id: event.payload.conversation_id,
              auto_generated: true,
            })
            setDismissed(false)
          }
        }
      ).then((unlisten) => {
        unlistenRef.current = unlisten
      })
    })

    return () => {
      unlistenRef.current?.()
    }
  }, [])

  if (!offering || dismissed) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-primary/30 bg-background p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0 text-lg">⚡</div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold">Nuevo skill generado</p>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground line-clamp-2">
            Se creo automaticamente "{offering.skill_name}" desde la conversacion.
          </p>
          <div className="mt-2 flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                window.open(`/workspace/skills`, "_blank")
                setDismissed(true)
              }}
            >
              Ver skill
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDismissed(true)}
            >
              Descartar
            </Button>
          </div>
        </div>
        <button
          className="flex-shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => setDismissed(true)}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
