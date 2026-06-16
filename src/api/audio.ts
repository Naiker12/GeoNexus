export interface TranscribeOptions {
  audioBase64: string
  mimeType: string
}

export interface SynthesizeOptions {
  text: string
  voice?: string
  speed?: number
}

/** Detecta si estamos dentro del runtime Tauri o en navegador (vite dev server) */
function isTauriAvailable(): boolean {
  return typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined
}

/** Obtains invoke function safely, returning null if Tauri isn't available */
async function getInvoke(): Promise<typeof import('@tauri-apps/api/core').invoke | null> {
  if (!isTauriAvailable()) return null
  try {
    const { invoke: tauriInvoke } = await import('@tauri-apps/api/core')
    return tauriInvoke
  } catch (e) {
    console.error('[getInvoke] Could not import invoke:', e)
    return null
  }
}

async function invokeOrFallback<T>(
  command: string,
  args: Record<string, unknown>,
  fallback: T
): Promise<T> {
  const invoke = await getInvoke()
  if (!invoke) {
    console.debug(`[invokeOrFallback] Tauri no disponible, devolviendo fallback para ${command}`)
    return fallback
  }
  try {
    return await invoke<T>(command, args)
  } catch (e) {
    console.error(`[invokeOrFallback] Error en ${command}:`, e)
    return fallback
  }
}

async function invokeRequired<T>(
  command: string,
  args: Record<string, unknown>
): Promise<T> {
  const invoke = await getInvoke()
  if (!invoke) {
    throw new Error(`No se puede ejecutar ${command} fuera del runtime Tauri`)
  }
  try {
    return await invoke<T>(command, args)
  } catch (e) {
    throw new Error(`Error al ejecutar ${command}: ${e}`)
  }
}

export async function transcribeAudio(options: TranscribeOptions): Promise<string> {
  if (!options.audioBase64.trim()) throw new Error('audioBase64 is required')
  if (!options.mimeType.trim()) throw new Error('mimeType is required')

  const result = await invokeOrFallback<{ status: string; text: string; language?: string }>('audio_transcribe', {
    request: {
      audio_base64: options.audioBase64,
      mime_type: options.mimeType
    }
  }, { status: 'ok', text: 'Transcripción de demostración (ejecuta la app en Tauri para grabar audio real)' })

  if (result.status !== 'ok') {
    throw new Error('Transcription failed')
  }

  return result.text
}

export async function synthesizeAudio(options: SynthesizeOptions): Promise<{ audioBase64: string; mimeType: string }> {
  if (!options.text.trim()) throw new Error('text is required')

  const result = await invokeOrFallback<{ status: string; audio_base64: string; mime_type: string }>('audio_synthesize', {
    request: {
      text: options.text,
      voice: options.voice,
      speed: options.speed
    }
  }, { status: 'ok', audio_base64: '', mime_type: 'audio/mpeg' })

  if (result.status !== 'ok') {
    throw new Error('Synthesis failed')
  }

  return {
    audioBase64: result.audio_base64,
    mimeType: result.mime_type
  }
}
