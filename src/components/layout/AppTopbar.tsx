import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ModelHeaderPopover } from "@/components/chat/ModelHeaderPopover"

type AppTopbarProps = {
  connector: string
  model: string
  status: "online" | "offline" | "needs-key"
}

export function AppTopbar({ connector, model, status }: AppTopbarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="hidden data-[orientation=vertical]:h-4 sm:block"
      />

      <div className="ml-auto flex items-center gap-3">
        <ModelHeaderPopover />
      </div>
    </header>
  )
}
