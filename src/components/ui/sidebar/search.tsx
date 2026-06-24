import * as React from "react"
import { SearchIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type SidebarSearchProps = {
  placeholder?: string
  value: string
  onChange: (value: string) => void
  className?: string
  results?: React.ReactNode
}

function SidebarSearch({
  placeholder = "Buscar conversaciones...",
  value,
  onChange,
  className,
  results,
}: SidebarSearchProps) {
  return (
    <div className={cn("relative px-2 py-1", className)}>
      <SearchIcon className="absolute left-4 top-1/2 size-3.5 -translate-y-1/2 text-sidebar-foreground/50" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-sidebar-border/50 bg-sidebar-accent/30 py-1.5 pl-8 pr-7 text-xs text-sidebar-foreground placeholder:text-sidebar-foreground/40 outline-none ring-sidebar-ring focus:border-sidebar-accent focus:ring-1"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-sidebar-foreground/40 hover:text-sidebar-foreground"
        >
          <XIcon className="size-3" />
        </button>
      )}
      {results && (
        <div className="mt-1 max-h-48 overflow-y-auto rounded-md border border-sidebar-border/50 bg-sidebar shadow-sm">
          {results}
        </div>
      )}
    </div>
  )
}

export { SidebarSearch }
export type { SidebarSearchProps }
