import { useState, useCallback } from "react"
import { invoke } from "@tauri-apps/api/core"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"

type OAuthStatus = "idle" | "pending" | "connected" | "error"

type OAuthProvider = "onedrive" | "dropbox" | "google_drive" | "sharepoint"

type OAuthConfig = {
  clientId: string
  redirectUri: string
  scope: string
  tenantId?: string
}

const PROVIDER_CONFIGS: Record<OAuthProvider, OAuthConfig> = {
  onedrive: {
    clientId: import.meta.env.VITE_ONEDRIVE_CLIENT_ID ?? "REPLACE_WITH_AZURE_CLIENT_ID",
    redirectUri: import.meta.env.VITE_ONEDRIVE_REDIRECT_URI ?? "geonexus://oauth/callback",
    scope: import.meta.env.VITE_ONEDRIVE_SCOPE ?? "Files.ReadWrite.Selected offline_access",
    tenantId: import.meta.env.VITE_ONEDRIVE_TENANT_ID ?? "common",
  },
  dropbox: {
    clientId: import.meta.env.VITE_DROPBOX_APP_KEY ?? "REPLACE_WITH_DROPBOX_KEY",
    redirectUri: "geonexus://oauth/callback",
    scope: "files.content.read files.content.write",
  },
  google_drive: {
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "",
    redirectUri: "geonexus://oauth/callback",
    scope: "https://www.googleapis.com/auth/drive.readonly",
  },
  sharepoint: {
    clientId: import.meta.env.VITE_ONEDRIVE_CLIENT_ID ?? "REPLACE_WITH_AZURE_CLIENT_ID",
    redirectUri: "geonexus://oauth/callback",
    scope: "Sites.ReadWrite.All offline_access",
    tenantId: import.meta.env.VITE_ONEDRIVE_TENANT_ID ?? "common",
  },
}

export function useOAuthFlow(provider: OAuthProvider) {
  const [status, setStatus] = useState<OAuthStatus>("idle")
  const [error, setError] = useState<string | null>(null)

  const connect = useCallback(async () => {
    setStatus("pending")
    setError(null)

    try {
      const config = PROVIDER_CONFIGS[provider]
      if (config.clientId.startsWith("REPLACE_WITH_")) {
        throw new Error(`OAuth no configurado: falta ${provider} client ID. Define VITE_${provider.toUpperCase()}_CLIENT_ID en .env`)
      }
      if (!config) throw new Error(`Configuración no encontrada para ${provider}`)

      // Generar PKCE desde Rust
      const { code_verifier, code_challenge } = await invoke<{
        code_verifier: string
        code_challenge: string
      }>("generate_pkce_challenge")

      // Almacenar code_verifier en sessionStorage (se pierde al cerrar)
      sessionStorage.setItem(`gx_oauth_verifier_${provider}`, code_verifier)

      // Construir URL y abrir navegador
      const authUrl = await invoke<string>("build_oauth_url", {
        provider,
        clientId: config.clientId,
        redirectUri: config.redirectUri,
        scope: config.scope,
        codeChallenge: code_challenge,
      })

      const { openUrl } = await import("@tauri-apps/plugin-opener")
      await openUrl(authUrl)

      // Escuchar callback OAuth vía deep link
      const unlisten = await listen<{ provider: string; code: string; success: boolean }>(
        "oauth:callback",
        async (event) => {
          if (event.payload.provider !== provider) return

          const savedVerifier = sessionStorage.getItem(`gx_oauth_verifier_${provider}`)
          if (!savedVerifier) {
            setError("No se encontró el code_verifier. Reintenta la conexión.")
            setStatus("error")
            return
          }

          if (event.payload.success && event.payload.code) {
            // Intercambiar código por tokens
            const tokenResponse = await invoke<{
              access_token: string
              refresh_token?: string
              expires_in: number
              token_type: string
            }>("exchange_oauth_code", {
              code: event.payload.code,
              codeVerifier: savedVerifier,
              clientId: config.clientId,
              tenantId: config.tenantId ?? "common",
              redirectUri: config.redirectUri,
            })

            // Guardar token
            await invoke("save_oauth_token", {
              provider,
              tokenJson: JSON.stringify(tokenResponse),
            })

            sessionStorage.removeItem(`gx_oauth_verifier_${provider}`)
            setStatus("connected")
          } else {
            setError("La autorización fue rechazada o cancelada.")
            setStatus("error")
          }

          unlisten()
        },
      )

      // Timeout de 5 minutos para el callback
      setTimeout(() => {
        setStatus("idle")
        setError("Tiempo de espera agotado. Reintenta la conexión.")
        unlisten()
      }, 300_000)
    } catch (err) {
      const message = typeof err === "string" ? err : err instanceof Error ? err.message : String(err)
      setError(message)
      setStatus("error")
    }
  }, [provider])

  const reset = useCallback(() => {
    setStatus("idle")
    setError(null)
  }, [])

  return { status, error, connect, reset }
}
