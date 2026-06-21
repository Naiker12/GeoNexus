import * as React from "react"
import {
  BotIcon,
  CheckIcon,
  Link2Icon,
  RefreshCwIcon,
  XCircleIcon,
  PlayIcon,
  StopCircleIcon,
  AlertTriangleIcon,
} from "lucide-react"
import { toast } from "sonner"
import { listen } from "@tauri-apps/api/event"

import { Button } from "@/components/ui/Button"
import { Field } from "@/features/workspace/configuration/settings-ui"
import {
  saveTelegramConfig,
  testTelegramConnection,
  startTelegramPolling,
  stopTelegramPolling,
  getTelegramStatus,
  loadTelegramConfig,
} from "@/api/telegram"
import { TelegramQrPairing } from "./TelegramQrPairing"

type TelegramConfig = {
  botToken: string
  responseMode: "text" | "sources" | "full"
  allowedUsers: string
  status: "disconnected" | "connecting" | "active" | "error"
  botName: string
  isPolling: boolean
}

const defaultConfig: TelegramConfig = {
  botToken: "",
  responseMode: "sources",
  allowedUsers: "",
  status: "disconnected",
  botName: "",
  isPolling: false,
}

export function TelegramIntegrationPanel() {
  const [config, setConfig] = React.useState<TelegramConfig>(defaultConfig)
  const [loading, setLoading] = React.useState(true)
  const [testing, setTesting] = React.useState(false)
  const [testResult, setTestResult] = React.useState<{
    kind: "success" | "error" | null
    message: string
  }>({ kind: null, message: "" })
  const [startingPolling, setStartingPolling] = React.useState(false)
  const [stoppingPolling, setStoppingPolling] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [hasSavedConfig, setHasSavedConfig] = React.useState(false)

  React.useEffect(() => {
    loadData()
  }, [])

  React.useEffect(() => {
    let unlisten: (() => void) | undefined
    listen<{ kind: string; message: string }>("telegram:error", (event) => {
      toast.error(event.payload.message)
      setConfig((prev) => ({ ...prev, status: "error", isPolling: false }))
    }).then((fn) => {
      unlisten = fn
    })
    return () => {
      unlisten?.()
    }
  }, [])

  async function loadData() {
    try {
      const info = await loadTelegramConfig()
      if (info?.has_config && info.allowed_users) {
        setHasSavedConfig(true)
        setConfig({
          ...defaultConfig,
          allowedUsers: info.allowed_users.join(", "),
          responseMode: (info.response_mode as any) || "sources",
        })
      }
      const status = await getTelegramStatus()
      const botName = status.botName
      if (botName) {
        setConfig((prev) => ({
          ...prev,
          botName,
          status: status.isRunning ? "active" : "disconnected",
          isPolling: status.isRunning,
        }))
      }
    } catch (e) {
      console.error("Error al cargar config de Telegram:", e)
    } finally {
      setLoading(false)
    }
  }

  const updateConfig = (patch: Partial<TelegramConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }))
  }

  async function handleSave() {
    const usersArray = config.allowedUsers
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)

    if (usersArray.length === 0) {
      toast.error("Debes añadir al menos un ID numérico de Telegram")
      return
    }

    for (const user of usersArray) {
      const normalized = user.startsWith("@") ? user.slice(1) : user
      if (!/^\d+$/.test(normalized)) {
        toast.error(`"${user}" no es un ID numérico válido`)
        return
      }
    }

    if (!config.botToken.trim()) {
      toast.error("El token del bot es obligatorio")
      return
    }

    setSaving(true)
    try {
      await saveTelegramConfig({
        botToken: config.botToken,
        allowedUsers: usersArray,
        responseMode: config.responseMode,
      })
      setHasSavedConfig(true)
      toast.success("Configuración guardada")
    } catch (e: any) {
      toast.error(e?.message || "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (!config.botToken.trim()) {
      setTestResult({ kind: "error", message: "Ingresa el token del bot" })
      return
    }

    const usersArray = config.allowedUsers
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)

    if (usersArray.length === 0) {
      setTestResult({ kind: "error", message: "Añade al menos un ID numérico de Telegram" })
      return
    }

    setTesting(true)
    setTestResult({ kind: null, message: "" })
    updateConfig({ status: "connecting" })

    try {
      const result = await testTelegramConnection(config.botToken.trim())
      const name = result.bot_username
        ? `@${result.bot_username}`
        : result.bot_name
      updateConfig({ status: "active", botName: name })
      setTestResult({ kind: "success", message: `Conectado como ${name}` })
      toast.success("Conexión exitosa")
    } catch {
      setTestResult({ kind: "error", message: "No se pudo conectar. Verifica el token." })
      updateConfig({ status: "error" })
    } finally {
      setTesting(false)
    }
  }

  const handleStartPolling = async () => {
    setStartingPolling(true)
    try {
      const botName = await startTelegramPolling()
      updateConfig({
        isPolling: true,
        botName: botName.startsWith("@") ? botName : `@${botName}`,
        status: "active",
      })
      toast.success("Bot iniciado!")
    } catch (e) {
      toast.error("Error al iniciar el bot")
      console.error(e)
    } finally {
      setStartingPolling(false)
    }
  }

  const handleStopPolling = async () => {
    setStoppingPolling(true)
    try {
      await stopTelegramPolling()
      updateConfig({ isPolling: false, status: "disconnected" })
      toast.success("Bot detenido")
    } catch (e) {
      toast.error("Error al detener el bot")
      console.error(e)
    } finally {
      setStoppingPolling(false)
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-primary">
            Integración de Telegram
          </h3>
          <p className="mt-1 text-xs leading-4 text-muted-foreground">
            Cargando...
          </p>
        </div>
      </div>
    )
  }

  const hasEmptyUsers = !config.allowedUsers.trim()
  const hasInvalidUsers = config.allowedUsers
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .some((u) => {
      const normalized = u.startsWith("@") ? u.slice(1) : u
      return !/^\d+$/.test(normalized)
    })

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
          <span className={`size-2.5 rounded-full ${statusColor[config.isPolling ? "active" : config.status]}`} />
          <span className="text-sm font-medium">
            {config.isPolling ? "Ejecutándose" : statusLabel[config.status]}
          </span>
          {config.botName && (
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

          <Field label="Usuarios permitidos (IDs numéricos)">
            <input
              value={config.allowedUsers}
              onChange={(e) => updateConfig({ allowedUsers: e.target.value })}
              placeholder="12345678, 87654321"
              className="h-8 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none transition focus:border-primary/50"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              IDs numéricos separados por coma. El bot solo responderá a estos usuarios.
            </p>
            {hasEmptyUsers && (
              <div className="mt-1 flex items-start gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-600">
                <AlertTriangleIcon className="mt-0.5 size-3 shrink-0" />
                <span>Debes añadir al menos un ID para restringir el acceso</span>
              </div>
            )}
            {hasInvalidUsers && (
              <div className="mt-1 flex items-start gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-600">
                <XCircleIcon className="mt-0.5 size-3 shrink-0" />
                <span>Usa solo IDs numéricos (no @usernames — los usernames pueden cambiar)</span>
              </div>
            )}
          </Field>

          {testResult.kind === "success" && (
            <div className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
              <CheckIcon className="mt-0.5 size-4 shrink-0" />
              <span>{testResult.message}</span>
            </div>
          )}

          {testResult.kind === "error" && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <XCircleIcon className="mt-0.5 size-4 shrink-0" />
              <span>{testResult.message}</span>
            </div>
          )}

          {config.status === "active" && !config.isPolling && (
            <div className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
              <CheckIcon className="mt-0.5 size-4 shrink-0" />
              <span>Conectado como: {config.botName}</span>
            </div>
          )}
          {config.isPolling && (
            <div className="flex items-start gap-2 rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm text-blue-600">
              <CheckIcon className="mt-0.5 size-4 shrink-0" />
              <span>Bot en ejecución: {config.botName}</span>
            </div>
          )}

          <div className="flex gap-2 pt-1 flex-wrap">
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

            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={saving || hasEmptyUsers || hasInvalidUsers || !config.botToken.trim()}
            >
              {saving ? "Guardando..." : "Guardar configuración"}
            </Button>

            {config.isPolling ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleStopPolling}
                disabled={stoppingPolling}
              >
                {stoppingPolling ? (
                  <RefreshCwIcon className="size-3.5 animate-spin" />
                ) : (
                  <StopCircleIcon className="size-3.5" />
                )}
                {stoppingPolling ? "Deteniendo..." : "Detener bot"}
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={handleStartPolling}
                disabled={startingPolling || !(hasSavedConfig || config.status === "active")}
              >
                {startingPolling ? (
                  <RefreshCwIcon className="size-3.5 animate-spin" />
                ) : (
                  <PlayIcon className="size-3.5" />
                )}
                {startingPolling ? "Iniciando..." : "Iniciar bot"}
              </Button>
            )}
          </div>

          <TelegramQrPairing
            botUsername={config.botName || null}
            enabled={hasSavedConfig || config.status === "active"}
          />
        </div>
      </div>
    </div>
  )
}
