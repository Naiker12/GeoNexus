let apiBase = ''

function detectTauri(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  return (
    '__TAURI__' in window ||
    '__TAURI_INTERNALS__' in window ||
    window.location.protocol === 'tauri:'
  )
}

const isTauri = detectTauri()

// Keep the base relative until Tauri reports a validated server-port. Port zero
// is deliberately rejected by Chromium as unsafe, which turned early startup
// probes into noisy `net::ERR_UNSAFE_PORT` errors before the backend was ready.
// A relative URL works through Vite's development proxy and fails normally (and
// recoverably) in a packaged webview until the real loopback port arrives.

const initialApiBase = apiBase

export function resetApiBase() {
  apiBase = initialApiBase
}

export function setApiBase(port: number) {
  if (!Number.isInteger(port) || port < 1 || port > 65_535) return
  apiBase = `http://127.0.0.1:${port}`
}

export function getApiBase(): string {
  return apiBase
}

export function apiUrl(path: string): string {
  if (path.startsWith('http')) return path
  return `${apiBase}${path}`
}

export { isTauri }
