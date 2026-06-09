import { useState } from "react"
import { ChevronDownIcon, ChevronUpIcon, GlobeIcon } from "lucide-react"

interface Props {
  sources: string[]
}

function formatUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

export function SearchSourcesBlock({ sources }: Props) {
  const [open, setOpen] = useState(false)

  if (sources.length === 0) return null

  return (
    <div className="mt-3 rounded-lg border border-border overflow-hidden text-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted transition-colors text-left"
      >
        <GlobeIcon className="size-3.5 text-muted-foreground shrink-0" />
        <span className="text-[12px] text-muted-foreground flex-1">
          {sources.length} fuente{sources.length !== 1 ? "s" : ""} consultada{sources.length !== 1 ? "s" : ""}
        </span>
        {open ? (
          <ChevronUpIcon className="size-3.5 text-muted-foreground" />
        ) : (
          <ChevronDownIcon className="size-3.5 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="divide-y divide-border">
          {sources.map((source, i) => {
            const display = formatUrl(source)
            return (
              <a
                key={i}
                href={source}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col px-3 py-2 hover:bg-muted/40 gap-0.5 no-underline"
              >
                <span className="text-[12px] font-medium text-foreground line-clamp-1">
                  {display}
                </span>
                <span className="text-[11px] text-emerald-600 line-clamp-1 break-all">
                  {source}
                </span>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
