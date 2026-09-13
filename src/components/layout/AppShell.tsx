import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { StatusIndicator } from './StatusIndicator'
import { useUiStore } from '@/stores/uiStore'
import { Button } from '@/components/ui/Button'

const TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  markets: 'Markets',
  volatility: 'Volatility',
  screener: 'Screener',
  analysis: 'Technical Analysis',
  portfolio: 'Portfolio',
  paper: 'Paper Trading',
  journal: 'Trading Journal',
  alerts: 'Alerts',
  watchlist: 'Watchlist',
  settings: 'Settings',
  asset: 'Asset'
}

export function AppShell({ children }: { children: ReactNode }) {
  const route = useUiStore((s) => s.route)
  const history = useUiStore((s) => s.history)
  const back = useUiStore((s) => s.back)
  const title = route.page === 'asset' ? route.symbol.toUpperCase() : TITLES[route.page]

  return (
    <div className="flex h-full w-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <Button variant="ghost" size="icon" onClick={back} aria-label="Back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <h1 className="text-sm font-semibold">{title}</h1>
          </div>
          <StatusIndicator />
        </header>
        <main className="min-h-0 flex-1 overflow-auto p-4">{children}</main>
      </div>
    </div>
  )
}
