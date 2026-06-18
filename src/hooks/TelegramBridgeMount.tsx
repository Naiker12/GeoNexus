import { useCallback, useEffect, useState } from "react"
import { useConnectors } from "@/contexts/ConnectorsContext"
import { sendMessage } from "@/api/chat"
import { getTelegramStatus } from "@/api/telegram"
import { useTelegramBridge } from "./useTelegramBridge"
import { DEFAULT_PROJECT_ID } from "@/api/data"

export function TelegramBridgeMount() {
  const { connectors, activeConnectorId } = useConnectors()
  const [isPolling, setIsPolling] = useState(false)

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        const status = await getTelegramStatus()
        if (!cancelled) setIsPolling(status.isRunning)
      } catch { /* ignore */ }
    }
    check()
    const interval = setInterval(check, 5000)
    return () => { cancelled = true; clearInterval(interval) }
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
      api_key: active.apiKey ?? null,
      use_context: false,
    })

    return response.message?.content ?? "No se pudo generar una respuesta."
  }, [connectors, activeConnectorId])

  useTelegramBridge({ enabled: isPolling, sendToLlm })

  return null
}
