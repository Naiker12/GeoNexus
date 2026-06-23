/** Telegram gateway adapter (inspired by Hermes gateway/). */

import { invoke } from "@tauri-apps/api/core"
import type { TelegramConfig } from "@/api/telegram"

export interface TelegramMessage {
  chat_id: number
  user_id: number
  username: string | null
  text: string
  content_type: "text" | "voice" | "photo" | "document" | "sticker" | "audio" | "video"
  content_summary: string
  file_id: string | null
  caption: string | null
}

export interface TelegramStatus {
  polling: boolean
  config: TelegramConfig | null
  last_error: string | null
}

export async function saveConfig(config: TelegramConfig): Promise<void> {
  await invoke("telegram_save_config", { config })
}

export async function loadConfig(): Promise<TelegramConfig | null> {
  return await invoke<TelegramConfig | null>("telegram_load_config")
}

export async function testConnection(config: TelegramConfig): Promise<boolean> {
  return await invoke<boolean>("telegram_test_connection", { config })
}

export async function startPolling(): Promise<void> {
  await invoke("telegram_start_polling")
}

export async function stopPolling(): Promise<void> {
  await invoke("telegram_stop_polling")
}

export async function getStatus(): Promise<TelegramStatus> {
  return await invoke<TelegramStatus>("telegram_get_status")
}

export async function generatePairingCode(): Promise<string> {
  return await invoke<string>("telegram_generate_pairing_code")
}

export async function sendResponse(chatId: number, text: string): Promise<void> {
  await invoke("telegram_send_response", { chatId, text })
}

export async function sendChatAction(chatId: number, action: string): Promise<void> {
  await invoke("telegram_send_chat_action", { chatId, action })
}
