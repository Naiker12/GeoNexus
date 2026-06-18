import * as React from "react"
import {
  BotIcon,
  CheckIcon,
  Link2Icon,
  RefreshCwIcon,
  XCircleIcon,
  PlayIcon,
  StopCircleIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/Button"
import { Field } from "@/features/workspace/configuration/settings-ui"
import {
  saveTelegramConfig,
  loadTelegramConfig,
  startTelegramPolling,
  stopTelegramPolling,
  getTelegramStatus,
  type TelegramConfig as ApiTelegramConfig,
} from "@/api/telegram"

type TelegramConfig = {
  botToken: string
  projectId: string
  responseMode: "text" | "sources" | "full"
  allowedUsers: string
  status: "disconnected" | "connecting" | "active" | "error"
  botName: string
  isPolling: boolean
}

const defaultConfig: TelegramConfig = {
  botToken: "",
  projectId: "",
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
  const [testError, setTestError] = React.useState<string | null>(null)
  const [startingPolling, setStartingPolling] = React.useState(false)
  const [stoppingPolling, setStoppingPolling] = React.useState(false)

  React.useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const savedConfig = await loadTelegramConfig()
      if (savedConfig) {
        setConfig({
          ...defaultConfig,
          botToken: savedConfig.botToken,
          responseMode: savedConfig.responseMode as any,
          allowedUsers: savedConfig.allowedUsers.join(", "),
        })
      }
      const status = await getTelegramStatus()
      if (status.botName) {
        setConfig((prev) => ({
          ...prev,
          botName: status.botName ?? prev.botName,
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

  const updateConfig = async (patch: Partial<TelegramConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch }
      saveToDb(next)
      return next
    })
  }

  async function saveToDb(cfg: TelegramConfig) {
    try {
      const allowedUsersArray = cfg.allowedUsers
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
      await saveTelegramConfig({
        botToken: cfg.botToken,
        allowedUsers: allowedUsersArray,
        responseMode: cfg.responseMode,
      })
    } catch (e) {
      console.error("Error al guardar config:", e)
    }
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
        const botName = data.result.username
          ? `@${data.result.username}`
          : data.result.first_name
        updateConfig({
          status: "active",
          botName,
        })
        toast.success("Conexión exitosa!")
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

  const handleStartPolling = async () => {
    setStartingPolling(true)
    try {
      const allowedUsersArray = config.allowedUsers
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
      const botName = await startTelegramPolling({
        token: config.botToken.trim(),
        allowedUsers: allowedUsersArray,
        responseMode: config.responseMode,
      })
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
                disabled={startingPolling || config.status !== "active"}
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
        </div>
      </div>
    </div>
  )
}
