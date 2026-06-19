import * as React from "react"
import type { SessionSummary } from "@/types/chat"

const WEB_SEARCH_KEY = "geonexus.webSearchEnabled"

function loadWebSearchEnabled(): boolean {
  try {
    const stored = localStorage.getItem(WEB_SEARCH_KEY)
    return stored === "true"
  } catch { return false }
}

function saveWebSearchEnabled(enabled: boolean) {
  try { localStorage.setItem(WEB_SEARCH_KEY, enabled ? "true" : "false") } catch { }
}

let researchTimerId: ReturnType<typeof setInterval> | null = null

export function useWebSearch() {
  const [webSearchEnabled, setWebSearchEnabled] = React.useState<boolean>(() => loadWebSearchEnabled())
  const [sessionSummary, setSessionSummary] = React.useState<SessionSummary | null>(null)
  const [lastIntent, setLastIntent] = React.useState<string | null>(null)

  React.useEffect(() => { saveWebSearchEnabled(webSearchEnabled) }, [webSearchEnabled])

  const startResearchTimer = React.useCallback((startTime: number, assistantMsgId: string, onTick: (elapsed: number) => void) => {
    researchTimerId = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000
      onTick(elapsed)
    }, 500)
  }, [])

  const stopResearchTimer = React.useCallback(() => {
    if (researchTimerId) {
      clearInterval(researchTimerId)
      researchTimerId = null
    }
  }, [])

  return {
    webSearchEnabled,
    setWebSearchEnabled,
    sessionSummary,
    setSessionSummary,
    lastIntent,
    setLastIntent,
    researchTimerId,
    startResearchTimer,
    stopResearchTimer,
  }
}
