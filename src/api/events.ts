function isTauriAvailable(): boolean {
  return typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined
}

async function getInvoke() {
  if (!isTauriAvailable()) return null
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke
  } catch { return null }
}

async function getListen() {
  if (!isTauriAvailable()) return null
  try {
    const { listen } = await import('@tauri-apps/api/event')
    return listen
  } catch { return null }
}

async function invokeOrFallback<T>(command: string, args: Record<string, unknown>, fallback: T): Promise<T> {
  const invoke = await getInvoke()
  if (!invoke) return fallback
  try { return await invoke<T>(command, args) }
  catch { return fallback }
}

export interface BusEvent {
  id: string
  domain: string
  action: string
  payload: Record<string, unknown>
  source: string
  timestamp: number
  conversation_id: string | null
}

export interface Artifact {
  id: string
  session_id: string
  name: string
  artifact_type: "code" | "report" | "map" | "dashboard" | "geo_json" | "pdf" | "csv" | "image"
  path: string | null
  content: string | null
  metadata: {
    language?: string
    description?: string
    line_count?: number
    status?: string
    [key: string]: any
  }
  created_at: number
}

export function subscribeToBusEvent(
  domain: string,
  action: string,
  callback: (event: BusEvent) => void,
): Promise<() => void> {
  return subscribeToTauriEvent(`bus:${domain}:${action}`, callback)
}

export function subscribeToAllBusEvents(callback: (event: BusEvent) => void): Promise<() => void> {
  return subscribeToTauriEvent("bus:event", callback)
}

async function subscribeToTauriEvent(eventName: string, callback: (data: any) => void): Promise<() => void> {
  const listen = await getListen()
  if (!listen) {
    console.debug(`[subscribeToTauriEvent] Tauri no disponible para ${eventName}`)
    return () => {}
  }
  const unlisten = await listen(eventName, (event: any) => {
    callback(event.payload as BusEvent)
  })
  return unlisten
}

// --- Artifact API ---

export function listArtifacts(sessionId: string): Promise<Artifact[]> {
  return invokeOrFallback("list_artifacts", { sessionId }, [])
}

export function openArtifact(artifactId: string): Promise<void> {
  return invokeOrFallback("open_artifact", { artifactId }, undefined)
}

export function getArtifactContent(artifactId: string): Promise<string> {
  return invokeOrFallback("get_artifact_content", { artifactId }, "")
}

export function deleteArtifact(id: string): Promise<boolean> {
  return invokeOrFallback("delete_artifact", { id }, false)
}

// --- Event API ---

export function listEvents(domain?: string, conversationId?: string, limit = 50, offset = 0): Promise<BusEvent[]> {
  return invokeOrFallback("list_events", { domain, conversationId, limit, offset }, [])
}

export function countEvents(domain?: string, conversationId?: string): Promise<number> {
  return invokeOrFallback("count_events", { domain, conversationId }, 0)
}

// --- Geo Event API (F3) ---

export interface GeoEvent {
  id: string
  session_id: string
  timestamp: number
  event_type: string
  payload: any
}

export function subscribeEvents(
  sessionId: string,
  callback: (event: GeoEvent) => void,
): Promise<() => void> {
  invokeOrFallback("subscribe_events", { sessionId }, null)
  return subscribeToTauriEvent("geo:event", callback)
}

export function listGeoEvents(
  sessionId: string,
  limit = 100,
  offset = 0,
): Promise<GeoEvent[]> {
  return invokeOrFallback("list_geo_events", { sessionId, limit, offset }, [])
}

