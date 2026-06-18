import { useEffect, useRef } from "react"
import { listen, UnlistenFn } from "@tauri-apps/api/event"
import { invoke } from "@tauri-apps/api/core"

interface TelegramMessage {
  chat_id: number
  user_id: number
  username: string | null
  text: string
  message_id: number
}

interface UseTelegramBridgeOptions {
  enabled: boolean
  sendToLlm: (text: string) => Promise<string>
}

export function useTelegramBridge({ enabled, sendToLlm }: UseTelegramBridgeOptions) {
  const unlistenRef = useRef<UnlistenFn | null>(null)
  const activeRequests = useRef<Set<number>>(new Set())

  useEffect(() => {
    if (!enabled) {
      unlistenRef.current?.()
      unlistenRef.current = null
      return
    }

    const setup = async () => {
      const unlisten = await listen<TelegramMessage>(
        "telegram:message",
        async (event) => {
          console.log("[Telegram] ⚡ Evento recibido:", event.payload)
          const msg = event.payload

          if (activeRequests.current.has(msg.message_id)) return
          activeRequests.current.add(msg.message_id)

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
            const errorMsg = err instanceof Error ? err.message : String(err)
            console.error("[Telegram] Error:", errorMsg)
            // Intentar con in-memory primero, luego con DB
            try {
              await invoke("telegram_send_response", {
                chatId: msg.chat_id,
                text: `Error: ${errorMsg}`,
              })
            } catch {
              try {
                await invoke("telegram_send_message", {
                  chatId: msg.chat_id,
                  text: `Error: ${errorMsg}`,
                })
              } catch { /* Telegram inaccesible */ }
            }
          } finally {
            setTimeout(() => activeRequests.current.delete(msg.message_id), 30_000)
          }
      },
      { target: { kind: "Any" } }
    )

    unlistenRef.current = unlisten
    }

    setup().catch((err) => {
      console.error("[Telegram] Error iniciando bridge:", err)
    })

    return () => {
      unlistenRef.current?.()
      unlistenRef.current = null
    }
  }, [enabled, sendToLlm])
}
