import React from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/geist'
import App from './App'
import { TooltipProvider } from './components/ui/tooltip'
import { ConnectorsProvider } from './contexts/ConnectorsContext'
import { CodingAgentProvider } from './contexts/CodingAgentContext'
import './index.css'

const root = createRoot(document.getElementById('root') as HTMLElement)
root.render(
  <React.StrictMode>
    <TooltipProvider>
      <ConnectorsProvider>
        <CodingAgentProvider>
          <App />
        </CodingAgentProvider>
      </ConnectorsProvider>
    </TooltipProvider>
  </React.StrictMode>
)
