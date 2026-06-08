import React from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/geist'
import App from './App'
import { TooltipProvider } from './components/ui/tooltip'
import { ToastProvider } from './components/ui/toast'
import './index.css'
 
const root = createRoot(document.getElementById('root') as HTMLElement)
root.render(
  <React.StrictMode>
    <TooltipProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </TooltipProvider>
  </React.StrictMode>
)
