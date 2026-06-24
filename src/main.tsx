import React from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/geist'
import App from './App'
import { TooltipProvider } from './components/ui/tooltip'
import { ConnectorsProvider } from './contexts/ConnectorsContext'
import './index.css'

try {
  if (typeof localStorage !== 'undefined') {
    const origGet = localStorage.getItem.bind(localStorage)
    const origSet = localStorage.setItem.bind(localStorage)
    const origRemove = localStorage.removeItem.bind(localStorage)
    const origClear = localStorage.clear.bind(localStorage)
    localStorage.getItem = function (key: string) {
      try { return origGet(key) } catch { return null }
    }
    localStorage.setItem = function (key: string, value: string) {
      try { origSet(key, value) } catch { /* tracking prevention */ }
    }
    localStorage.removeItem = function (key: string) {
      try { origRemove(key) } catch { /* tracking prevention */ }
    }
    localStorage.clear = function () {
      try { origClear() } catch { /* tracking prevention */ }
    }
  }
} catch { /* localStorage not available at all */ }

const root = createRoot(document.getElementById('root') as HTMLElement)
root.render(
  <React.StrictMode>
    <TooltipProvider>
      <ConnectorsProvider>
        <App />
      </ConnectorsProvider>
    </TooltipProvider>
  </React.StrictMode>
)
