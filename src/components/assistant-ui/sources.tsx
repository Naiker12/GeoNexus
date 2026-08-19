import { ExternalLinkIcon, FileTextIcon, GlobeIcon, NetworkIcon } from "lucide-react"

export interface SourceItem {
  id: string
  title: string
  url?: string
  snippet?: string
  sourceType?: "onedrive" | "arcgis" | "graph" | "github" | "filesystem" | "web"
}

interface SourcesProps {
  sources: SourceItem[]
}

function getSourceIcon(type?: string) {
  switch (type) {
    case "graph":
      return NetworkIcon
    case "web":
      return GlobeIcon
    default:
      return FileTextIcon
  }
}

export function Sources({ sources }: SourcesProps) {
  if (!sources || sources.length === 0) return null

  return (
    <div className="my-3 space-y-1.5">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
        Fuentes citadas ({sources.length})
      </p>
      <div className="flex flex-wrap gap-2">
        {sources.map((source, index) => {
          const Icon = getSourceIcon(source.sourceType)
          return (
            <a
              key={source.id || index}
              href={source.url || "#"}
              target={source.url ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl border border-border/80 bg-background/80 px-2.5 py-1.5 text-xs text-foreground shadow-2xs hover:bg-muted/60 transition-all max-w-xs truncate"
            >
              <div className="flex size-5 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <Icon className="size-3" />
              </div>
              <span className="truncate font-medium">{source.title}</span>
              {source.url && <ExternalLinkIcon className="size-3 shrink-0 text-muted-foreground" />}
            </a>
          )
        })}
      </div>
    </div>
  )
}
