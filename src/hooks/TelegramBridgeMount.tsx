import { useCallback, useEffect, useRef, useState } from "react"
import { useConnectors } from "@/contexts/ConnectorsContext"
import { sendMessage } from "@/api/chat"
import { getTelegramStatus, type TelegramStatus } from "@/api/telegram"
import { useTelegramBridge } from "./useTelegramBridge"
import { DEFAULT_PROJECT_ID } from "@/api/data"
import { toast } from "sonner"

interface TelegramErrorEvent {
  kind: string
  message: string
}

export function TelegramBridgeMount() {
  const { connectors, activeConnectorId } = useConnectors()
  const [status, setStatus] = useState<TelegramStatus>({ isRunning: false })
  const previousError = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        const s = await getTelegramStatus()
        if (!cancelled) {
          setStatus(s)
          if (s.error && s.error !== previousError.current) {
            previousError.current = s.error
            toast.error("Telegram", { description: s.error })
          }
        }
      } catch { /* ignore */ }
    }
    check()
    const interval = setInterval(check, 5000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  const handleError = useCallback((evt: TelegramErrorEvent) => {
    toast.error("Telegram", { description: evt.message })
  }, [])

  const sendToLlm = useCallback(async (text: string): Promise<string> => {
    const active = connectors.find((c) => c.id === activeConnectorId)
    if (!active || active.model === "Sin modelo" || active.endpoint === "Sin endpoint") {
      return "No hay un modelo de IA configurado. Configura un connector primero en Ajustes > Conexiones."
    }

    const response = await sendMessage({
      project_id: DEFAULT_PROJECT_ID,
      conversation_id: null,
      content: text,
      provider: active.id,
      model: active.model,
      endpoint: active.endpoint,
      api_key: null,
      use_context: false,
    })

    return response.message?.content ?? "No se pudo generar una respuesta."
  }, [connectors, activeConnectorId])

  useTelegramBridge({ enabled: status.isRunning, sendToLlm, onError: handleError })

  return null
}
