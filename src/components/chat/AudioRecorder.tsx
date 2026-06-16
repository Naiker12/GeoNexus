import React from 'react'
import { MicIcon, SquareIcon, Loader2Icon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'

interface AudioRecorderProps {
  onTranscription: (text: string) => void
  disabled?: boolean
}

export function AudioRecorder({ onTranscription, disabled = false }: AudioRecorderProps) {
  const { status, startRecording, stopRecording, errorMessage } = useAudioRecorder({
    onTranscription
  })

  if (status === 'recording') {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Stop recording"
        onClick={stopRecording}
        className="text-red-500 animate-pulse"
      >
        <SquareIcon className="size-4" />
      </Button>
    )
  }

  if (status === 'processing') {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Processing audio"
        disabled
      >
        <Loader2Icon className="size-4 animate-spin" />
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Record audio"
      onClick={startRecording}
      disabled={disabled}
      title={errorMessage || 'Record audio'}
    >
      <MicIcon className="size-4" />
    </Button>
  )
}
