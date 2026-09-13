import { useEffect } from 'react'
import { TooltipProvider } from '@/components/ui/Tooltip'
import { AppShell } from '@/components/layout/AppShell'
import { useUiStore } from '@/stores/uiStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useConnectivityStore } from '@/stores/connectivityStore'
import { useMarketStore } from '@/stores/marketStore'
import { api } from '@/lib/api'
import { SettingsPage } from '@/pages/SettingsPage'
import { MarketsPage } from '@/pages/MarketsPage'
import { AssetPage } from '@/pages/AssetPage'
import { WatchlistPage } from '@/pages/WatchlistPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { AnalysisPage } from '@/pages/AnalysisPage'
import { VolatilityPage } from '@/pages/VolatilityPage'
import { ScreenerPage } from '@/pages/ScreenerPage'
import { PortfolioPage } from '@/pages/PortfolioPage'
import { PaperTradingPage } from '@/pages/PaperTradingPage'
import { JournalPage } from '@/pages/JournalPage'
import { AlertsPage } from '@/pages/AlertsPage'
import { HistoryPage } from '@/pages/HistoryPage'
import { useAlertStore } from '@/stores/alertStore'
import { usePaperStore } from '@/stores/paperStore'
import { usePortfolioStore } from '@/stores/portfolioStore'
import { useWatchlistStore } from '@/stores/watchlistStore'
import { useAnalyticsStore } from '@/stores/analyticsStore'

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
      return <VolatilityPage />
    case 'screener':
      return <ScreenerPage />
    case 'analysis':
      return <AnalysisPage />
    case 'history':
      return <HistoryPage />
    case 'portfolio':
      return <PortfolioPage />
    case 'paper':
      return <PaperTradingPage />
    case 'journal':
      return <JournalPage />
    case 'alerts':
      return <AlertsPage />
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
  const loadAnalytics = useAnalyticsStore((s) => s.load)
  const loadPortfolios = usePortfolioStore((s) => s.load)
  const loadPaper = usePaperStore((s) => s.load)
  const loadAlerts = useAlertStore((s) => s.load)
  const applyAlerts = useAlertStore((s) => s.apply)
  const applyAnalytics = useAnalyticsStore((s) => s.apply)

  useEffect(() => {
    void loadSettings()
    void loadMarket()
    void loadWatchlists()
    void loadAnalytics()
    void loadPortfolios()
    void loadPaper()
    void loadAlerts()
    const offAlerts = api.events.on('alerts:changed', applyAlerts)
    const offAnalytics = api.events.on('analytics:snapshot', applyAnalytics)
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
      offAnalytics()
      offAlerts()
      offConn()
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOnline)
    }
  }, [loadSettings, applyRemote, setConnectivity, loadMarket, applySnapshot, loadWatchlists, loadAnalytics, applyAnalytics, loadPortfolios, loadPaper, loadAlerts, applyAlerts])

  return (
    <TooltipProvider>
      <AppShell>
        <CurrentPage />
      </AppShell>
    </TooltipProvider>
  )
}
