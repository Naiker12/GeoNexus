import { useState, useRef, useCallback } from 'react'
import { transcribeAudio } from '@/api/audio'

type UseAudioRecorderOptions = {
  onTranscription: (text: string) => void
  onError?: (error: string) => void
}

type UseAudioRecorderReturn = {
  status: 'idle' | 'requesting' | 'recording' | 'processing' | 'error'
  startRecording: () => Promise<void>
  stopRecording: () => void
  errorMessage: string | null
  volume: number
}

export function useAudioRecorder(options: UseAudioRecorderOptions): UseAudioRecorderReturn {
  const [status, setStatus] = useState<'idle' | 'requesting' | 'recording' | 'processing' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [volume, setVolume] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const startRecording = useCallback(async () => {
    try {
      setStatus('requesting')
      setErrorMessage(null)

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)

      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      const updateVolume = () => {
        analyser.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length
        setVolume(average)
        animationFrameRef.current = requestAnimationFrame(updateVolume)
      }
      updateVolume()

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data)
      }

      mediaRecorder.start()
      setStatus('recording')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Microphone access denied'
      setErrorMessage(message)
      options.onError?.(message)
      setStatus('error')
    }
  }, [options])

  const stopRecording = useCallback(() => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    setVolume(0)

    if (mediaRecorderRef.current && (status === 'recording' || status === 'requesting')) {
      setStatus('processing')
      
      mediaRecorderRef.current.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'audio/webm' })
          
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(audioBlob)
          })
          
          const base64Data = base64.split(',')[1]
          const text = await transcribeAudio({ audioBase64: base64Data, mimeType: audioBlob.type })
          
          options.onTranscription(text)
          setStatus('idle')
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Transcription failed'
          setErrorMessage(message)
          options.onError?.(message)
          setStatus('error')
        }
      }

      mediaRecorderRef.current.stop()
      streamRef.current?.getTracks().forEach(track => track.stop())
    }
  }, [status, options])

  return { status, startRecording, stopRecording, errorMessage, volume }
}
