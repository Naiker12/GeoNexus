import { useState, useRef, useCallback } from 'react'
import { synthesizeAudio } from '@/api/audio'
import { toast } from 'sonner'

type UseVoicePlayerOptions = {
  text: string
  voiceId?: string
}

type UseVoicePlayerReturn = {
  status: 'idle' | 'synthesizing' | 'playing' | 'error'
  play: () => Promise<void>
  stop: () => void
  progress: number
  errorMessage: string | null
}

export function useVoicePlayer(options: UseVoicePlayerOptions): UseVoicePlayerReturn {
  const [status, setStatus] = useState<'idle' | 'synthesizing' | 'playing' | 'error'>('idle')
  const [progress, setProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const play = useCallback(async () => {
    try {
      setStatus('synthesizing')
      setErrorMessage(null)
      
      // Stop any existing playback
      stop()

      const { audioBase64, mimeType } = await synthesizeAudio({
        text: options.text,
        voice: options.voiceId || 'am_michael',
        provider: 'kokoro',
        lang: 'es',
        speed: 1.3,
      })

      if (!audioBase64) {
        throw new Error('Audio vacio recibido del sintetizador')
      }

      const audioUrl = `data:${mimeType};base64,${audioBase64}`
      const audio = new Audio(audioUrl)
      audioRef.current = audio

      audio.ontimeupdate = () => {
        if (audio.duration) {
          setProgress(audio.currentTime / audio.duration)
        }
      }

      audio.onended = () => {
        setStatus('idle')
        setProgress(0)
      }

      audio.onerror = () => {
        const msg = 'Error al reproducir el audio'
        setErrorMessage(msg)
        setStatus('error')
        toast.error('Reproduccion fallida', {
          description: 'Verifica la configuracion del proveedor TTS',
        })
      }

      await audio.play()
      setStatus('playing')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setErrorMessage(message)
      setStatus('error')
      toast.error('Sintesis de voz fallida', {
        description: message,
      })
    }
  }, [options.text, options.voiceId])

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    setStatus('idle')
    setProgress(0)
  }, [])

  return {
    status,
    play,
    stop,
    progress,
    errorMessage
  }
}
