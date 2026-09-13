import { useEffect } from 'react'
import { TooltipProvider } from '@/components/ui/Tooltip'
import { AppShell } from '@/components/layout/AppShell'
import { useUiStore } from '@/stores/uiStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useConnectivityStore } from '@/stores/connectivityStore'
import { api } from '@/lib/api'
import { SettingsPage } from '@/pages/SettingsPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'

function CurrentPage() {
  const route = useUiStore((s) => s.route)
  switch (route.page) {
    case 'settings':
      return <SettingsPage />
    case 'dashboard':
      return <PlaceholderPage name="Dashboard" phase={3} />
    case 'markets':
      return <PlaceholderPage name="Markets" phase={2} />
    case 'asset':
      return <PlaceholderPage name={`Asset ${route.symbol}`} phase={2} />
    case 'volatility':
      return <PlaceholderPage name="Volatility" phase={5} />
    case 'screener':
      return <PlaceholderPage name="Screener" phase={6} />
    case 'analysis':
      return <PlaceholderPage name="Technical Analysis" phase={4} />
    case 'portfolio':
      return <PlaceholderPage name="Portfolio" phase={7} />
    case 'paper':
      return <PlaceholderPage name="Paper Trading" phase={8} />
    case 'journal':
      return <PlaceholderPage name="Trading Journal" phase={9} />
    case 'alerts':
      return <PlaceholderPage name="Alerts" phase={10} />
    case 'watchlist':
      return <PlaceholderPage name="Watchlist" phase={3} />
  }
}

export default function App() {
  const loadSettings = useSettingsStore((s) => s.load)
  const applyRemote = useSettingsStore((s) => s.applyRemote)
  const setConnectivity = useConnectivityStore((s) => s.set)

  useEffect(() => {
    void loadSettings()
    const offSettings = api.events.on('settings:changed', applyRemote)
    const offConn = api.events.on('connectivity:changed', setConnectivity)
    const onOnline = () => setConnectivity({ ...useConnectivityStore.getState(), online: navigator.onLine })
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOnline)
    return () => {
      offSettings()
      offConn()
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOnline)
    }
  }, [loadSettings, applyRemote, setConnectivity])

  return (
    <TooltipProvider>
      <AppShell>
        <CurrentPage />
      </AppShell>
    </TooltipProvider>
  )
}
