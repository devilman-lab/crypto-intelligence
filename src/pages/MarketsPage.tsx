import { useMemo, useState } from 'react'
import { RefreshCw, Search } from 'lucide-react'
import type { Ticker } from '@shared/types'
import { useMarketStore } from '@/stores/marketStore'
import { useUiStore } from '@/stores/uiStore'
import { useDebounce } from '@/hooks/useDebounce'
import { VirtualTable, type Column } from '@/components/table/VirtualTable'
import { AssetCell } from '@/components/market/AssetCell'
import { PctChange } from '@/components/market/PctChange'
import { WatchStar } from '@/components/market/WatchStar'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatCompactCurrency, formatCurrency, formatRelativeTime } from '@/lib/format'
import { cn } from '@/lib/cn'

export function MarketsPage() {
  const { tickers, updatedAt, stale, loading, refreshing, error, refresh } = useMarketStore()
  const navigate = useUiStore((s) => s.navigate)
  const [query, setQuery] = useState('')
  const q = useDebounce(query.trim().toLowerCase())

  const rows = useMemo(() => {
    if (!q) return tickers
    return tickers.filter((t) => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q))
  }, [tickers, q])

  const columns = useMemo<Column<Ticker>[]>(
    () => [
      { key: 'star', header: '', width: '32px', align: 'center', render: (t) => <WatchStar assetId={t.assetId} /> },
      { key: 'rank', header: '#', width: '48px', align: 'right', render: (t) => <span className="num text-fg-muted">{t.rank ?? '—'}</span>, sortValue: (t) => t.rank },
      { key: 'asset', header: 'Asset', width: 'minmax(200px, 2fr)', render: (t) => <AssetCell ticker={t} />, sortValue: (t) => t.symbol },
      { key: 'price', header: 'Price', width: 'minmax(110px, 1fr)', align: 'right', render: (t) => <span className="num">{formatCurrency(t.price)}</span>, sortValue: (t) => t.price },
      { key: 'c1h', header: '1h', width: '80px', align: 'right', render: (t) => <PctChange value={t.change1hPct} />, sortValue: (t) => t.change1hPct },
      { key: 'c24h', header: '24h', width: '84px', align: 'right', render: (t) => <PctChange value={t.change24hPct} />, sortValue: (t) => t.change24hPct },
      { key: 'c7d', header: '7d', width: '84px', align: 'right', render: (t) => <PctChange value={t.change7dPct} />, sortValue: (t) => t.change7dPct },
      { key: 'mcap', header: 'Market cap', width: 'minmax(110px, 1fr)', align: 'right', render: (t) => <span className="num">{formatCompactCurrency(t.marketCap)}</span>, sortValue: (t) => t.marketCap },
      { key: 'vol', header: 'Volume 24h', width: 'minmax(110px, 1fr)', align: 'right', render: (t) => <span className="num">{formatCompactCurrency(t.volume24h)}</span>, sortValue: (t) => t.volume24h },
      { key: 'volat', header: 'Volatility', width: '90px', align: 'right', title: 'Annualized 30-day historical volatility (Phase 5)', render: () => <span className="num text-fg-subtle">—</span> },
      { key: 'rsi', header: 'RSI', width: '64px', align: 'right', title: 'RSI(14) on daily candles (Phase 4)', render: () => <span className="num text-fg-subtle">—</span> }
    ],
    []
  )

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex shrink-0 items-center gap-2">
        <div className="relative w-72">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search symbol or name…" className="pl-7" aria-label="Search assets" />
        </div>
        <span className="text-xs text-fg-muted">
          {rows.length} of {tickers.length} assets
        </span>
        {stale && tickers.length > 0 && <Badge tone="warning">Cached data</Badge>}
        <div className="ml-auto flex items-center gap-2 text-xs text-fg-muted">
          <span>{updatedAt ? `Updated ${formatRelativeTime(updatedAt)}` : loading ? 'Loading…' : 'No data yet'}</span>
          <Button size="icon" variant="ghost" onClick={() => void refresh()} disabled={refreshing} aria-label="Refresh">
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
          </Button>
        </div>
      </div>
      {error && tickers.length === 0 && <div className="rounded-md border border-warning/40 bg-warning-soft px-3 py-2 text-xs text-warning">{error}</div>}
      <VirtualTable
        columns={columns}
        rows={rows}
        rowKey={(t) => t.assetId}
        defaultSort={{ key: 'rank', dir: 'asc' }}
        onRowClick={(t) => navigate({ page: 'asset', assetId: t.assetId })}
        emptyMessage={loading ? 'Loading market data…' : tickers.length === 0 ? 'Market data is unavailable. Check your connection and refresh.' : 'No assets match your search.'}
        className="min-h-0 flex-1"
      />
    </div>
  )
}
