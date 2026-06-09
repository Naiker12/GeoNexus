import * as React from "react"
import { CloudIcon } from "lucide-react"

import { providerOptions } from "@/features/workspace/ai-containers/provider-options"
import type { AiConnector } from "@/features/workspace/workspace-data"

const STORAGE_KEY = "geonexus.connectors"
const ACTIVE_ID_KEY = "geonexus.activeConnectorId"

type ConnectorData = Omit<AiConnector, "icon">

function loadConnectors(): AiConnector[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const data: ConnectorData[] = JSON.parse(raw)
    return data.map((item) => ({
      ...item,
      icon: providerOptions.find((p) => p.id === item.id)?.icon ?? CloudIcon,
    }))
  } catch {
    return []
  }
}

function saveConnectors(connectors: AiConnector[]) {
  try {
    const data: ConnectorData[] = connectors.map(
      ({ icon: _icon, ...rest }) => rest
    )
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // localStorage may be full or unavailable
  }
}

function loadActiveId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_ID_KEY)
  } catch {
    return null
  }
}

function saveActiveId(id: string | null) {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_ID_KEY, id)
    } else {
      localStorage.removeItem(ACTIVE_ID_KEY)
    }
  } catch {
    // localStorage may be full or unavailable
  }
}

type ConnectorsContextValue = {
  connectors: AiConnector[]
  setConnectors: React.Dispatch<React.SetStateAction<AiConnector[]>>
  activeConnectorId: string | null
  setActiveConnectorId: (id: string | null) => void
}

const ConnectorsContext = React.createContext<ConnectorsContextValue | null>(
  null
)

export function ConnectorsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [connectors, setConnectors] = React.useState<AiConnector[]>(() =>
    loadConnectors()
  )
  const [activeConnectorId, setActiveConnectorId] = React.useState<
    string | null
  >(() => loadActiveId())

  React.useEffect(() => {
    saveConnectors(connectors)
  }, [connectors])

  React.useEffect(() => {
    saveActiveId(activeConnectorId)
  }, [activeConnectorId])

  return (
    <ConnectorsContext.Provider
      value={{
        connectors,
        setConnectors,
        activeConnectorId,
        setActiveConnectorId,
      }}
    >
      {children}
    </ConnectorsContext.Provider>
  )
}

export function useConnectors() {
  const ctx = React.useContext(ConnectorsContext)
  if (!ctx) {
    throw new Error("useConnectors must be used within <ConnectorsProvider>")
  }
  return ctx
}
