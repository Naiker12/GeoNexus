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

export interface TelegramTestResult {
  ok: boolean;
  bot_username: string;
  bot_id: number;
  bot_name: string;
}

export interface TelegramConfigInfo {
  has_config: boolean;
  allowed_users?: string[];
  response_mode?: string;
  bot_configured?: boolean;
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

export async function loadTelegramConfig(): Promise<TelegramConfigInfo | null> {
  if (!isTauriAvailable()) return null;
  return await invoke<TelegramConfigInfo | null>("telegram_load_config");
}

export async function testTelegramConnection(token?: string): Promise<TelegramTestResult> {
  if (!isTauriAvailable()) throw new Error("Tauri not available");
  return await invoke<TelegramTestResult>("telegram_test_connection", { token: token ?? null });
}

export async function startTelegramPolling(): Promise<string> {
  if (!isTauriAvailable()) throw new Error("Tauri not available");
  return await invoke<string>("telegram_start_polling");
}

export async function stopTelegramPolling(): Promise<void> {
  if (!isTauriAvailable()) return;
  await invoke("telegram_stop_polling");
}

export interface PairingCodeInfo {
  code: string;
  expires_in_secs: number;
}

export async function generatePairingCode(): Promise<PairingCodeInfo> {
  if (!isTauriAvailable()) throw new Error("Tauri not available");
  return await invoke<PairingCodeInfo>("telegram_generate_pairing_code");
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
