import React from 'react'
import { AudioLinesIcon, SquareIcon, Loader2Icon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useVoicePlayer } from '@/hooks/useVoicePlayer'

interface VoicePlayerProps {
  text: string
  voiceId?: string
  className?: string
}

export function VoicePlayer({ text, voiceId, className = '' }: VoicePlayerProps) {
  const { status, play, stop, errorMessage } = useVoicePlayer({ text, voiceId })

  if (status === 'playing') {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Stop playback"
        onClick={stop}
        className={className}
      >
        <SquareIcon className="size-4" />
      </Button>
    )
  }

  if (status === 'synthesizing') {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Synthesizing audio"
        disabled
        className={className}
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
      aria-label="Play audio"
      onClick={play}
      title={errorMessage || 'Play audio'}
      className={className}
    >
      <AudioLinesIcon className="size-4" />
    </Button>
  )
}
