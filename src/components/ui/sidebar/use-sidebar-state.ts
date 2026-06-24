import * as React from "react"

import { useSidebar } from "./context"

const SIDEBAR_WIDTH_STORAGE_KEY = "geonexus:sidebar-width"

type SidebarState = {
  width: number
  setWidth: (width: number) => void
  resetWidth: () => void
}

const DEFAULT_WIDTH = 280
const MIN_WIDTH = 200
const MAX_WIDTH = 480

function useSidebarState(): SidebarState {
  const sidebar = useSidebar()

  const [width, setWidthState] = React.useState<number>(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY)
      if (stored) {
        const parsed = parseInt(stored, 10)
        if (!isNaN(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
          return parsed
        }
      }
    } catch {}
    return DEFAULT_WIDTH
  })

  const setWidth = React.useCallback((newWidth: number) => {
    const clamped = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, newWidth))
    setWidthState(clamped)
    try {
      localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(clamped))
    } catch {}
  }, [])

  const resetWidth = React.useCallback(() => {
    setWidth(DEFAULT_WIDTH)
  }, [setWidth])

  return {
    width,
    setWidth,
    resetWidth,
  }
}

export { useSidebarState, DEFAULT_WIDTH, MIN_WIDTH, MAX_WIDTH }
export type { SidebarState }
