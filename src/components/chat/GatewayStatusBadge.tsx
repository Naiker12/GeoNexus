import * as React from "react"
import { invoke } from "@tauri-apps/api/core"
import { cn } from "@/lib/utils"

export function GatewayStatusBadge() {
  const [connected, setConnected] = React.useState<boolean | null>(null)

  React.useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        const ok = await invoke<boolean>("check_gateway")
        if (!cancelled) setConnected(ok)
      } catch {
        if (!cancelled) setConnected(false)
      }
    }
    check()
    const interval = setInterval(check, 15000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  if (connected === null || connected) return null

  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
      <span className="inline-block size-1.5 rounded-full bg-amber-500 animate-pulse" />
      Modo local
    </span>
  )
}