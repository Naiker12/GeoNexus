export type NotificationCategory =
  | "chat_response"
  | "document_indexed"
  | "sync_completed"
  | "sync_error"
  | "graph_updated"
  | "llm_error"
  | "connector_connected"
  | "connector_error"
  | "export_ready"
  | "system_warning"

export type NotificationChannel = "toast" | "os" | "sound"

export type ToastPosition =
  | "bottom-right"
  | "bottom-left"
  | "top-right"
  | "top-left"
  | "bottom-center"

export type ToastDuration = "short" | "medium" | "long" | "persist"

export interface NotificationPreference {
  category: NotificationCategory
  enabled: boolean
  channels: NotificationChannel[]
}

export interface NotificationSettings {
  masterEnabled: boolean
  toastPosition: ToastPosition
  toastDuration: ToastDuration
  osNotificationsEnabled: boolean
  soundEnabled: boolean
  preferences: NotificationPreference[]
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  masterEnabled: true,
  toastPosition: "bottom-right",
  toastDuration: "medium",
  osNotificationsEnabled: false,
  soundEnabled: false,
  preferences: [
    { category: "chat_response", enabled: true, channels: ["toast"] },
    { category: "document_indexed", enabled: true, channels: ["toast"] },
    { category: "sync_completed", enabled: true, channels: ["toast"] },
    { category: "sync_error", enabled: true, channels: ["toast", "os"] },
    { category: "graph_updated", enabled: false, channels: ["toast"] },
    { category: "llm_error", enabled: true, channels: ["toast", "os"] },
    { category: "connector_connected", enabled: true, channels: ["toast"] },
    { category: "connector_error", enabled: true, channels: ["toast", "os"] },
    { category: "export_ready", enabled: true, channels: ["toast", "os"] },
    { category: "system_warning", enabled: true, channels: ["toast", "os"] },
  ],
}

export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  chat_response: "Respuesta del chat",
  document_indexed: "Documento indexado",
  sync_completed: "Sincronización completada",
  sync_error: "Error de sincronización",
  graph_updated: "Grafo actualizado",
  llm_error: "Error de LLM",
  connector_connected: "Conector conectado",
  connector_error: "Error de conector",
  export_ready: "Exportación lista",
  system_warning: "Alerta del sistema",
}

export const CATEGORY_ORDER: NotificationCategory[] = [
  "chat_response",
  "document_indexed",
  "sync_completed",
  "sync_error",
  "graph_updated",
  "llm_error",
  "connector_connected",
  "connector_error",
  "export_ready",
  "system_warning",
]
