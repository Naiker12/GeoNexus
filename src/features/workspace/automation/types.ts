export interface Automation {
  id: string
  project_id: string
  name: string
  description: string | null
  cron_expression: string | null
  intent: string
  action_type: string
  action_config: any
  channel: string
  enabled: boolean
  last_run_at: number | null
  next_run_at: number | null
  run_count: number
  created_at: number
  updated_at: number
}

export const ACTION_TYPES = [
  { id: "chat", label: "Enviar mensaje", description: "Envía un mensaje predefinido al chat" },
  { id: "webhook", label: "Webhook", description: "Llama a una URL externa" },
  { id: "skill", label: "Ejecutar skill", description: "Dispara un skill instalado" },
  { id: "export", label: "Exportar datos", description: "Genera un reporte o exportación" },
] as const

export const CHANNELS = [
  { id: "all", label: "Todos los canales" },
  { id: "desktop", label: "Solo escritorio" },
  { id: "telegram", label: "Solo Telegram" },
] as const

export type ActionType = (typeof ACTION_TYPES)[number]["id"]
export type ChannelId = (typeof CHANNELS)[number]["id"]
