import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { useUiStore, type Page } from './stores/uiStore'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

// Navigation hook used by the screenshot helper (electron/main/devtools.ts). Harmless in production: it only changes the in-app route.
{
  ;(window as unknown as { __navigate?: (page: string) => void }).__navigate = (page) => {
    if (page.startsWith('asset:')) useUiStore.getState().navigate({ page: 'asset', symbol: page.slice(6) })
    else useUiStore.getState().navigate({ page: page as Page })
  }
}
