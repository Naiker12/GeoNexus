export interface TranscribeOptions {
  audioBase64: string
  mimeType: string
}

interface TranscribeResponse {
  status: string
  text: string
  language?: string
}

function isTauriAvailable(): boolean {
  return typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined
}

async function getInvoke(): Promise<typeof import('@tauri-apps/api/core').invoke | null> {
  if (!isTauriAvailable()) return null
  try {
    const { invoke: tauriInvoke } = await import('@tauri-apps/api/core')
    return tauriInvoke
  } catch {
    return null
  }
}

async function invokeAudioCommand<T>(
  command: string,
  args: Record<string, unknown>,
  fallback: T
): Promise<T> {
  const invoke = await getInvoke()
  if (!invoke) return fallback
  try {
    return await invoke<T>(command, args)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    throw new Error(`No se pudo ejecutar ${command}: ${message}`)
  }
}

export async function transcribeAudio(options: TranscribeOptions): Promise<string> {
  if (!options.audioBase64.trim()) throw new Error('audioBase64 is required')
  if (!options.mimeType.trim()) throw new Error('mimeType is required')

  const result = await invokeAudioCommand<TranscribeResponse>('audio_transcribe', {
    request: { audio_base64: options.audioBase64, mime_type: options.mimeType }
  }, { status: 'ok', text: 'Transcripcion de demostracion' })

  if (result.status !== 'ok') throw new Error('Transcription failed')
  return result.text
}


