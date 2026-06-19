import { useEffect, useState, useRef, createContext, useContext, type Dispatch, type SetStateAction } from "react"
import { CloudIcon } from "lucide-react"

import { providerOptions } from "@/features/workspace/ai-containers/provider-options"
import type { AiConnector } from "@/features/workspace/workspace-data"
import { setSecure, getSecure, deleteSecure } from "@/api/secure"

const STORAGE_KEY = "geonexus.connectors"
const ACTIVE_ID_KEY = "geonexus.activeConnectorId"

type ConnectorData = Omit<AiConnector, "icon" | "apiKey">

function secureKey(id: string): string {
  return `connector_api_key:${id}`
}

function stripApiKeys(connectors: AiConnector[]): ConnectorData[] {
  return connectors.map(({ icon: _icon, apiKey: _key, ...rest }) => rest)
}

function loadConnectorsMeta(): ConnectorData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function saveConnectorsMeta(connectors: ConnectorData[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(connectors))
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
  setConnectors: Dispatch<SetStateAction<AiConnector[]>>
  activeConnectorId: string | null
  setActiveConnectorId: (id: string | null) => void
}

const ConnectorsContext = createContext<ConnectorsContextValue | null>(null)

export function ConnectorsProvider({ children }: { children: React.ReactNode }) {
  const [connectors, setConnectors] = useState<AiConnector[]>([])
  const [ready, setReady] = useState(false)
  const [activeConnectorId, setActiveConnectorId] = useState<string | null>(() => loadActiveId())
  const savedRef = useRef(false)

  // Carga inicial: migrar desde localStorage + secure store
  useEffect(() => {
    async function init() {
      const metaList = loadConnectorsMeta()
      if (metaList.length === 0) {
        setReady(true)
        return
      }

      // Migrar API keys desde localStorage legacy
      const migrated: AiConnector[] = []
      let needsSave = false

      for (const meta of metaList) {
        const secureKeyId = secureKey(meta.id)
        let apiKey: string | undefined = (await getSecure(secureKeyId)) ?? undefined

        // Migración desde localStorage legacy (donde apiKey estaba en el JSON)
        if (!apiKey) {
          const raw = localStorage.getItem(STORAGE_KEY)
          if (raw) {
            try {
              const legacy: any[] = JSON.parse(raw)
              const entry = legacy.find((c: any) => c.id === meta.id)
              if (entry?.apiKey) {
                apiKey = String(entry.apiKey)
                await setSecure(secureKeyId, apiKey)
                needsSave = true
              }
            } catch {}
          }
        }

        migrated.push({
          ...meta,
          apiKey: apiKey ?? undefined,
          icon: providerOptions.find((p) => p.id === meta.id)?.icon ?? CloudIcon,
        })
      }

      // Si migramos claves, limpiar localStorage legacy
      if (needsSave) {
        saveConnectorsMeta(stripApiKeys(migrated))
      }

      setConnectors(migrated)
      setReady(true)
    }
    init()
  }, [])

  // Persistir metadata (sin apiKey) a localStorage
  useEffect(() => {
    if (!ready) return
    savedRef.current = true
    saveConnectorsMeta(stripApiKeys(connectors))
  }, [connectors, ready])

  // Persistir apiKeys al secure store cuando cambian
  useEffect(() => {
    if (!ready) return
    const prevSaved = savedRef.current
    savedRef.current = true
    if (!prevSaved) return // skip initial effect after load

    for (const c of connectors) {
      if (c.apiKey) {
        setSecure(secureKey(c.id), c.apiKey)
      } else {
        deleteSecure(secureKey(c.id))
      }
    }
  }, [connectors, ready])

  // Persistir activeConnectorId
  useEffect(() => {
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
  const ctx = useContext(ConnectorsContext)
  if (!ctx) {
    throw new Error("useConnectors must be used within <ConnectorsProvider>")
  }
  return ctx
}
