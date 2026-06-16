import * as React from "react"
import { CloudIcon, FileTextIcon, GitForkIcon, XIcon } from "lucide-react"
import type { MentionKind } from "@/types/chat"

export type Chip = {
  id: string
  kind: MentionKind
  label: string
  color: string
  file?: File
  previewUrl?: string
  base64Data?: string
}

export type AttachmentChipsProps = {
  chips: Chip[]
  onRemoveChip: (id: string) => void
}

export function AttachmentChips({ chips, onRemoveChip }: AttachmentChipsProps) {
  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {chips.map((chip) => {
        const Icon = chip.kind === "graph_node" ? GitForkIcon : chip.kind === "asset" ? FileTextIcon : CloudIcon
        return (
          <div key={chip.id} className="group relative">
            {chip.previewUrl ? (
              <div className="relative overflow-hidden rounded-lg border border-border bg-card/80">
                <img
                  src={chip.previewUrl}
                  alt={chip.label}
                  className="w-24 h-24 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => {
                      if (chip.previewUrl) {
                        URL.revokeObjectURL(chip.previewUrl)
                      }
                      onRemoveChip(chip.id)
                    }}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
                  >
                    <XIcon className="size-3" />
                  </button>
                  <p className="absolute bottom-1 left-2 right-2 text-[10px] text-white truncate">
                    @{chip.label}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (chip.previewUrl) {
                      URL.revokeObjectURL(chip.previewUrl)
                    }
                    onRemoveChip(chip.id)
                  }}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 opacity-100 group-hover:opacity-100"
                >
                  <XIcon className="size-3" />
                </button>
              </div>
            ) : (
              <span
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium"
                style={{
                  backgroundColor: `${chip.color}18`,
                  border: `1px solid ${chip.color}44`,
                  color: chip.color,
                }}
              >
                <Icon className="size-4" />
                <span className="max-w-32 truncate">@{chip.label}</span>
                <button
                  type="button"
                  onClick={() => onRemoveChip(chip.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity hover:opacity-70"
                >
                  <XIcon className="size-3" />
                </button>
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
