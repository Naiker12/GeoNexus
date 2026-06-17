import React from 'react'
import { MicIcon, SquareIcon, Loader2Icon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import { cn } from '@/lib/utils'

interface AudioRecorderProps {
  onTranscription: (text: string) => void
  disabled?: boolean
}

export function AudioRecorder({ onTranscription, disabled = false }: AudioRecorderProps) {
  const { status, startRecording, stopRecording, errorMessage, volume } = useAudioRecorder({
    onTranscription
  })

  if (status === 'recording' || status === 'requesting') {
    const v = Math.max(0.5, (volume / 40) + 0.5)
    
    return (
      <div className="flex items-center gap-3 px-3 py-1 bg-red-500/10 dark:bg-red-500/20 rounded-full border border-red-500/30 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-1 h-5 w-12 justify-center">
          {status === 'recording' ? (
            <>
              <div 
                className="w-1 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] transition-all duration-75" 
                style={{ height: '8px', transform: `scaleY(${v * 0.8})` }} 
              />
              <div 
                className="w-1 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] transition-all duration-75" 
                style={{ height: '14px', transform: `scaleY(${v * 1.2})` }} 
              />
              <div 
                className="w-1 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] transition-all duration-75" 
                style={{ height: '10px', transform: `scaleY(${v})` }} 
              />
              <div 
                className="w-1 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] transition-all duration-75" 
                style={{ height: '16px', transform: `scaleY(${v * 1.4})` }} 
              />
              <div 
                className="w-1 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] transition-all duration-75" 
                style={{ height: '8px', transform: `scaleY(${v * 0.9})` }} 
              />
            </>
          ) : (
            <Loader2Icon className="size-4 animate-spin text-red-500/70" />
          )}
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 animate-pulse">
          {status === 'recording' ? 'REC' : 'WAIT'}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={stopRecording}
          className="text-red-500 hover:bg-red-500 hover:text-white transition-all rounded-full p-1"
        >
          <SquareIcon className="size-3 fill-current" />
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
      title={errorMessage || (status === 'error' ? 'Error: click para reintentar' : 'Grabar audio')}
      className={cn(
        "transition-colors shrink-0",
        status === 'error' ? "text-destructive hover:text-destructive/80" : "text-muted-foreground hover:text-primary"
      )}
    >
      <MicIcon className="size-4" />
    </Button>
  )
}
