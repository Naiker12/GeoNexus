import * as React from "react"

import { Textarea } from "@/components/ui/Textarea"
import { AttachmentChips } from "@/components/chat/AttachmentChips"
import { CompactPicker } from "@/components/chat/CompactPicker"
import type { Chip } from "@/components/chat/AttachmentChips"
import type { CompactPickerItem } from "@/components/chat/CompactPicker"

type ComposerInputProps = {
  value: string
  textareaRef: React.RefObject<HTMLTextAreaElement>
  chips: Chip[]
  onRemoveChip: (id: string) => void
  trigger: string | null
  pickerItems: CompactPickerItem[]
  selectedPickerIndex: number
  anchorPosition: { x: number; y: number }
  placeholder?: string
  onChange: (newValue: string, event: React.ChangeEvent<HTMLTextAreaElement>) => void
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void
}

function ComposerInput({
  value,
  textareaRef,
  chips,
  onRemoveChip,
  trigger,
  pickerItems,
  selectedPickerIndex,
  anchorPosition,
  placeholder = "Pregunta lo que quieras   ·   / para comandos   ·   @ para adjuntar fuentes",
  onChange,
  onKeyDown,
}: ComposerInputProps) {
  return (
    <div className="relative w-full">
      {chips.length > 0 && (
        <AttachmentChips chips={chips} onRemoveChip={onRemoveChip} />
      )}

      {trigger !== null && pickerItems.length > 0 && (
        <CompactPicker
          items={pickerItems}
          selectedIndex={selectedPickerIndex}
          anchorPosition={anchorPosition}
        />
      )}

      <Textarea
        ref={textareaRef}
        rows={1}
        value={value}
        autoComplete="off"
        className="max-h-28 min-h-8 border-0 bg-transparent px-1 py-1.5 text-base leading-5 shadow-none focus-visible:ring-0 md:text-sm"
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value, e)}
        onKeyDown={onKeyDown}
      />
    </div>
  )
}

export { ComposerInput }
export type { ComposerInputProps }
