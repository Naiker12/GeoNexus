import * as React from "react"
import { BotIcon, CheckIcon, Link2Icon, RefreshCwIcon, UserIcon, XCircleIcon } from "lucide-react"

import { Button } from "@/components/ui/Button"
import { Field } from "@/features/workspace/configuration/settings-ui"

const STORAGE_KEY = "geonexus.telegram"

type TelegramConfig = {
  botToken: string
  projectId: string
  responseMode: "text" | "sources" | "full"
  allowedUsers: string
  status: "disconnected" | "connecting" | "active" | "error"
  botName: string
}

const defaultConfig: TelegramConfig = {
  botToken: "",
  projectId: "",
  responseMode: "sources",
  allowedUsers: "",
  status: "disconnected",
  botName: "",
}

function loadConfig(): TelegramConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultConfig
    return { ...defaultConfig, ...JSON.parse(raw) }
  } catch {
    return defaultConfig
  }
}

function saveConfig(config: TelegramConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {}
}

export function TelegramIntegrationPanel() {
  const [config, setConfig] = React.useState<TelegramConfig>(loadConfig)
  const [testing, setTesting] = React.useState(false)
  const [testError, setTestError] = React.useState<string | null>(null)

  const updateConfig = (patch: Partial<TelegramConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch }
      saveConfig(next)
      return next
    })
  }

  const handleTest = async () => {
    if (!config.botToken.trim()) {
      setTestError("Ingresa el token del bot")
      return
    }
    setTesting(true)
    setTestError(null)
    updateConfig({ status: "connecting" })

    try {
      const res = await fetch(
        `https://api.telegram.org/bot${config.botToken.trim()}/getMe`
      )
      const data = await res.json()
      if (data.ok) {
        updateConfig({
          status: "active",
          botName: data.result.username
            ? `@${data.result.username}`
            : data.result.first_name,
        })
      } else {
        setTestError(data.description || "Token inválido")
        updateConfig({ status: "error" })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setTestError(msg)
      updateConfig({ status: "error" })
    } finally {
      setTesting(false)
    }
  }

  const statusColor = {
    disconnected: "bg-gray-400",
    connecting: "bg-amber-400 animate-pulse",
    active: "bg-emerald-500",
    error: "bg-red-500",
  }

  const statusLabel = {
    disconnected: "Desconectado",
    connecting: "Conectando...",
    active: "Activo",
    error: "Error",
  }

  return (
    <div className="grid gap-4">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-primary">
          Integración de Telegram
        </h3>
        <p className="mt-1 text-xs leading-4 text-muted-foreground">
          Recibe consultas GIS desde Telegram y responde con el conocimiento del
          proyecto activo.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-background/75 p-3">
        <div className="mb-3 flex items-center gap-2">
          <span className={`size-2.5 rounded-full ${statusColor[config.status]}`} />
          <span className="text-sm font-medium">{statusLabel[config.status]}</span>
          {config.status === "active" && config.botName && (
            <span className="text-xs text-muted-foreground">
              · {config.botName}
            </span>
          )}
        </div>

        <div className="grid gap-3">
          <Field label="Bot Token">
            <div className="flex gap-2">
              <input
                type="password"
                value={config.botToken}
                onChange={(e) => updateConfig({ botToken: e.target.value, status: "disconnected" })}
                placeholder="1234567890:AAFxxx..."
                className="h-8 flex-1 rounded-lg border border-border bg-background px-2.5 text-sm outline-none transition focus:border-primary/50"
              />
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => window.open("https://t.me/botfather", "_blank")}
              >
                <Link2Icon className="size-3.5" />
                BotFather
              </Button>
            </div>
          </Field>

          <Field label="Modo de respuesta">
            <select
              value={config.responseMode}
              onChange={(e) => updateConfig({ responseMode: e.target.value as TelegramConfig["responseMode"] })}
              className="h-8 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none"
            >
              <option value="text">Solo texto</option>
              <option value="sources">Texto + fuentes consultadas</option>
              <option value="full">Análisis completo con razonamiento</option>
            </select>
          </Field>

          <Field label="Usuarios permitidos (opcional)">
            <input
              value={config.allowedUsers}
              onChange={(e) => updateConfig({ allowedUsers: e.target.value })}
              placeholder="@username o chat ID (separados por coma)"
              className="h-8 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none transition focus:border-primary/50"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Vacío = cualquier usuario puede consultar
            </p>
          </Field>

          {testError && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <XCircleIcon className="mt-0.5 size-4 shrink-0" />
              <span>{testError}</span>
            </div>
          )}

          {config.status === "active" && (
            <div className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
              <CheckIcon className="mt-0.5 size-4 shrink-0" />
              <span>Conectado como: {config.botName}</span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={testing || !config.botToken.trim()}
            >
              {testing ? (
                <RefreshCwIcon className="size-3.5 animate-spin" />
              ) : (
                <BotIcon className="size-3.5" />
              )}
              {testing ? "Probando..." : "Probar conexión"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
