import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

export interface CompactPickerItem {
  id: string
  title: string
  subtitle?: string
  icon: React.ReactNode
  group: string
  onPick: () => void
}

interface CompactPickerProps {
  items: CompactPickerItem[]
  selectedIndex: number
  anchorPosition: { x: number; y: number }
}

function groupBy<T extends { group: string }>(
  arr: T[]
): Record<string, T[]> {
  return arr.reduce(
    (acc, item) => {
      ;(acc[item.group] ??= []).push(item)
      return acc
    },
    {} as Record<string, T[]>
  )
}

export function CompactPicker({
  items,
  selectedIndex,
  anchorPosition,
}: CompactPickerProps) {
  if (items.length === 0) return null

  const groups = groupBy(items)
  let flatIdx = -1

  return createPortal(
    <>
      <style>{`
        .compact-picker-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .compact-picker-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .compact-picker-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--border));
          border-radius: 2px;
        }
        .compact-picker-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: hsl(var(--border)) transparent;
        }
      `}</style>
      <div
        className="fixed z-50 w-[260px] overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-xl"
        style={{
          left: anchorPosition.x,
          bottom: window.innerHeight - anchorPosition.y + 8,
          animation: "pickerFadeIn 0.12s ease-out",
        }}
      >
        <div className="compact-picker-scrollbar max-h-[280px] overflow-y-auto py-1">
          {Object.entries(groups).map(([groupName, groupItems]) => (
            <div key={groupName}>
              <div className="px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {groupName}
              </div>
              {groupItems.map((item) => {
                flatIdx++
                const isSelected = flatIdx === selectedIndex
                return (
                  <button
                    key={item.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      item.onPick()
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] transition-colors",
                      isSelected
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                      {item.icon}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate leading-tight">{item.title}</span>
                      {item.subtitle && (
                        <span className="truncate text-[11px] leading-tight text-muted-foreground/70">
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </>,
    document.body
  )
}
