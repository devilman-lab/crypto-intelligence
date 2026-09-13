import { useEffect } from 'react'
import { TooltipProvider } from '@/components/ui/Tooltip'
import { AppShell } from '@/components/layout/AppShell'
import { useUiStore } from '@/stores/uiStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useConnectivityStore } from '@/stores/connectivityStore'
import { useMarketStore } from '@/stores/marketStore'
import { api } from '@/lib/api'
import { SettingsPage } from '@/pages/SettingsPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { MarketsPage } from '@/pages/MarketsPage'
import { AssetPage } from '@/pages/AssetPage'
import { WatchlistPage } from '@/pages/WatchlistPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { AnalysisPage } from '@/pages/AnalysisPage'
import { useWatchlistStore } from '@/stores/watchlistStore'

function CurrentPage() {
  const route = useUiStore((s) => s.route)
  switch (route.page) {
    case 'settings':
      return <SettingsPage />
    case 'dashboard':
      return <DashboardPage />
    case 'markets':
      return <MarketsPage />
    case 'asset':
      return <AssetPage assetId={route.assetId} />
    case 'volatility':
      return <PlaceholderPage name="Volatility" phase={5} />
    case 'screener':
      return <PlaceholderPage name="Screener" phase={6} />
    case 'analysis':
      return <AnalysisPage />
    case 'portfolio':
      return <PlaceholderPage name="Portfolio" phase={7} />
    case 'paper':
      return <PlaceholderPage name="Paper Trading" phase={8} />
    case 'journal':
      return <PlaceholderPage name="Trading Journal" phase={9} />
    case 'alerts':
      return <PlaceholderPage name="Alerts" phase={10} />
    case 'watchlist':
      return <WatchlistPage />
  }
}

export default function App() {
  const loadSettings = useSettingsStore((s) => s.load)
  const applyRemote = useSettingsStore((s) => s.applyRemote)
  const setConnectivity = useConnectivityStore((s) => s.set)
  const loadMarket = useMarketStore((s) => s.load)
  const applySnapshot = useMarketStore((s) => s.applySnapshot)
  const loadWatchlists = useWatchlistStore((s) => s.load)

  useEffect(() => {
    void loadSettings()
    void loadMarket()
    void loadWatchlists()
    void api.market.getStatus().then(setConnectivity).catch(() => undefined)
    const offTickers = api.events.on('market:tickers', applySnapshot)
    const offSettings = api.events.on('settings:changed', applyRemote)
    const offConn = api.events.on('connectivity:changed', setConnectivity)
    const onOnline = () => setConnectivity({ ...useConnectivityStore.getState(), online: navigator.onLine })
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOnline)
    return () => {
      offSettings()
      offTickers()
      offConn()
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOnline)
    }
  }, [loadSettings, applyRemote, setConnectivity, loadMarket, applySnapshot, loadWatchlists])

  return (
    <TooltipProvider>
      <AppShell>
        <CurrentPage />
      </AppShell>
    </TooltipProvider>
  )
}
