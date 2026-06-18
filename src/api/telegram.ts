import { invoke } from "@tauri-apps/api/core";

export interface TelegramConfig {
  botToken: string;
  allowedUsers: string[];
  responseMode: string;
}

export interface TelegramStatus {
  isRunning: boolean;
  botName?: string;
  error?: string;
}

function isTauriAvailable(): boolean {
  return typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined;
}

export async function saveTelegramConfig(config: TelegramConfig): Promise<void> {
  if (!isTauriAvailable()) return;
  await invoke("telegram_save_config", {
    token: config.botToken,
    allowedUsers: config.allowedUsers,
    responseMode: config.responseMode,
  });
}

export async function loadTelegramConfig(): Promise<TelegramConfig | null> {
  if (!isTauriAvailable()) return null;
  const config = await invoke<any | null>("telegram_load_config");
  if (!config) return null;
  return {
    botToken: config.bot_token,
    allowedUsers: config.allowed_users,
    responseMode: config.response_mode,
  };
}

export async function startTelegramPolling(config?: {
  token: string;
  allowedUsers: string[];
  responseMode: string;
}): Promise<string> {
  if (!isTauriAvailable()) throw new Error("Tauri not available");
  return await invoke<string>("telegram_start_polling", {
    token: config?.token ?? null,
    allowedUsers: config?.allowedUsers ?? null,
    responseMode: config?.responseMode ?? null,
  });
}

export async function stopTelegramPolling(): Promise<void> {
  if (!isTauriAvailable()) return;
  await invoke("telegram_stop_polling");
}

export async function getTelegramStatus(): Promise<TelegramStatus> {
  if (!isTauriAvailable()) {
    return { isRunning: false };
  }
  const status = await invoke<any>("telegram_get_status");
  return {
    isRunning: status.is_running,
    botName: status.bot_name,
    error: status.error,
  };
}

export async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  if (!isTauriAvailable()) return;
  await invoke("telegram_send_message", { chatId, text });
}

export async function codingAgentStartGeneration(
  description: string,
  projectPath: string
): Promise<string> {
  if (!isTauriAvailable()) throw new Error("Tauri not available");
  return await invoke<string>("coding_agent_start_generation", {
    description,
    projectPath,
  });
}
