import React from 'react'
import { MicIcon, SquareIcon, Loader2Icon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
interface AudioRecorderProps {
  onTranscription: (text: string) => void
  disabled?: boolean
}

export function AudioRecorder({ onTranscription, disabled = false }: AudioRecorderProps) {
  const { status, startRecording, stopRecording, cancelRecording, errorMessage } = useAudioRecorder({
    onTranscription,
  })

  if (status === 'recording' || status === 'requesting') {
    return (
      <div className="flex items-center gap-1">
        <div className="flex items-end gap-[2px] h-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-0.5 bg-red-500 rounded-full animate-pulse"
              style={{
                height: `${4 + Math.random() * 12}px`,
                animationDelay: `${i * 0.12}s`,
                animationDuration: `${0.5 + Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Stop recording"
          onClick={stopRecording}
          className="text-red-500 hover:bg-red-500/10"
        >
          <SquareIcon className="size-4" />
        </Button>
      </div>
    )
  }

  if (status === 'processing') {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled
        className="text-primary animate-pulse"
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
      onClick={startRecording}
      disabled={disabled}
      title={errorMessage || 'Grabar audio'}
    >
      <MicIcon className="size-4" />
    </Button>
  )
}
