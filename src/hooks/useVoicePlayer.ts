import { useState, useRef, useCallback } from 'react'
import { synthesizeAudio } from '@/api/audio'

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
        voice: options.voiceId
      })

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
        setErrorMessage('Failed to play audio')
        setStatus('error')
      }

      await audio.play()
      setStatus('playing')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setErrorMessage(message)
      setStatus('error')
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
