import { useEffect, useRef } from "react"
import { listen, UnlistenFn } from "@tauri-apps/api/event"
import { invoke } from "@tauri-apps/api/core"

interface TelegramMessage {
  chat_id: number
  user_id: number
  username: string | null
  text: string
}

interface TelegramErrorEvent {
  kind: string
  message: string
}

interface UseTelegramBridgeOptions {
  enabled: boolean
  sendToLlm: (text: string) => Promise<string>
  onError?: (error: TelegramErrorEvent) => void
}

export function useTelegramBridge({ enabled, sendToLlm, onError }: UseTelegramBridgeOptions) {
  const unlistenRef = useRef<UnlistenFn | null>(null)
  const unlistenErrorRef = useRef<UnlistenFn | null>(null)
  const activeRequests = useRef<Set<number>>(new Set())

  useEffect(() => {
    if (!enabled) {
      unlistenRef.current?.()
      unlistenRef.current = null
      unlistenErrorRef.current?.()
      unlistenErrorRef.current = null
      return
    }

    const setup = async () => {
      const unlisten = await listen<TelegramMessage>(
        "telegram:message",
        async (event) => {
          const msg = event.payload
          const dedupKey = msg.chat_id * 1000 + msg.user_id

          if (activeRequests.current.has(dedupKey)) return
          activeRequests.current.add(dedupKey)

          try {
            await invoke("telegram_send_chat_action", {
              chatId: msg.chat_id,
              action: "typing",
            })

            const response = await sendToLlm(msg.text)

            if (!response?.trim()) {
              await invoke("telegram_send_response", {
                chatId: msg.chat_id,
                text: "No pude generar una respuesta. Intenta de nuevo.",
              })
              return
            }

            await invoke("telegram_send_response", {
              chatId: msg.chat_id,
              text: response,
            })
          } catch (err) {
            console.error("[TelegramBridge] Error:", err)
            await invoke("telegram_send_response", {
              chatId: msg.chat_id,
              text: "Lo siento, ocurrió un error procesando tu mensaje. Por favor intenta de nuevo.",
            })
          } finally {
            setTimeout(() => activeRequests.current.delete(dedupKey), 30_000)
          }
        },
      )

      const unlistenError = await listen<TelegramErrorEvent>(
        "telegram:error",
        (event) => {
          console.error("[TelegramBridge] Error event:", event.payload)
          onError?.(event.payload)
        },
      )

      unlistenRef.current = unlisten
      unlistenErrorRef.current = unlistenError
    }

    setup().catch((err) => {
      console.error("[Telegram] Error iniciando bridge:", err)
    })

    return () => {
      unlistenRef.current?.()
      unlistenRef.current = null
      unlistenErrorRef.current?.()
      unlistenErrorRef.current = null
    }
  }, [enabled, sendToLlm, onError])
}
