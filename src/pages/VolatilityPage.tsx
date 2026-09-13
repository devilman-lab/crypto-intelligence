import { useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import type { AssetMetrics, Ticker } from '@shared/types'
import { useMarketStore } from '@/stores/marketStore'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useUiStore } from '@/stores/uiStore'
import { VirtualTable, type Column } from '@/components/table/VirtualTable'
import { VolatilityHeatmap, volColor, type VolPeriod } from '@/components/volatility/VolatilityHeatmap'
import { AssetCell } from '@/components/market/AssetCell'
import { PctChange } from '@/components/market/PctChange'
import { Panel } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { Tooltip } from '@/components/ui/Tooltip'
import { api } from '@/lib/api'
import { formatCompactCurrency, formatCurrency, formatRelativeTime } from '@/lib/format'
import { cn } from '@/lib/cn'
import { isStablecoin } from '@shared/analysis/classify'
import { Switch } from '@/components/ui/Switch'

type Row = { ticker: Ticker; metrics: AssetMetrics }

const PERIODS: { value: VolPeriod; label: string; hint: string }[] = [
  { value: 'vol24h', label: '24h', hint: 'Annualised realised volatility of the last 24 hourly returns' },
  { value: 'vol7d', label: '7d', hint: 'Annualised realised volatility of the last 7 daily returns' },
  { value: 'vol30d', label: '30d', hint: 'Annualised realised volatility of the last 30 daily returns' }
]

export function VolPct({ value }: { value: number | null | undefined }) {
  if (value == null) return <span className="num text-fg-subtle">—</span>
  return (
    <span className="num inline-flex items-center gap-1.5">
      <span className="inline-block h-2 w-2 rounded-sm" style={{ background: volColor(value) }} />
      {(value * 100).toFixed(1)}%
    </span>
  )
}

export function VolatilityPage() {
  const tickers = useMarketStore((s) => s.tickers)
  const { metrics, updatedAt, progress } = useAnalyticsStore()
  const navigate = useUiStore((s) => s.navigate)
  const [period, setPeriod] = useState<VolPeriod>('vol7d')
  const [view, setView] = useState<'ranking' | 'heatmap'>('ranking')
  const [hideStable, setHideStable] = useState(true)

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = []
    for (const t of tickers) {
      const m = metrics[t.assetId]
      if (!m || m[period] == null) continue
      if (hideStable && isStablecoin(t, m)) continue
      out.push({ ticker: t, metrics: m })
    }
    return out
  }, [tickers, metrics, period, hideStable])

  const columns = useMemo<Column<Row>[]>(
    () => [
      { key: 'rank', header: '#', width: '44px', align: 'right', render: (r) => <span className="num text-fg-muted">{r.ticker.rank ?? '—'}</span>, sortValue: (r) => r.ticker.rank },
      { key: 'asset', header: 'Asset', width: 'minmax(180px, 2fr)', render: (r) => <AssetCell ticker={r.ticker} />, sortValue: (r) => r.ticker.symbol },
      { key: 'price', header: 'Price', width: 'minmax(100px, 1fr)', align: 'right', render: (r) => <span className="num">{formatCurrency(r.ticker.price)}</span>, sortValue: (r) => r.ticker.price },
      { key: 'vol', header: `Volatility ${PERIODS.find((p) => p.value === period)!.label}`, width: '120px', align: 'right', title: 'Annualised realised volatility', render: (r) => <VolPct value={r.metrics[period]} />, sortValue: (r) => r.metrics[period] },
      { key: 'chg', header: 'Vol change', width: '100px', align: 'right', title: '7d volatility vs the previous 7-day window', render: (r) => <PctChange value={r.metrics.volChange != null ? r.metrics.volChange * 100 : null} digits={1} />, sortValue: (r) => r.metrics.volChange },
      { key: 'pct', header: 'Percentile', width: '90px', align: 'right', title: 'Where the current 7d volatility sits within the trailing year (100 = highest)', render: (r) => <Percentile value={r.metrics.volPercentile} />, sortValue: (r) => r.metrics.volPercentile },
      { key: 'atr', header: 'ATR %', width: '80px', align: 'right', title: 'ATR(14) on daily candles as % of price', render: (r) => <span className="num">{r.metrics.atrPct != null ? `${r.metrics.atrPct.toFixed(2)}%` : '—'}</span>, sortValue: (r) => r.metrics.atrPct },
      { key: 'c24', header: '24h', width: '80px', align: 'right', render: (r) => <PctChange value={r.ticker.change24hPct} />, sortValue: (r) => r.ticker.change24hPct },
      { key: 'mcap', header: 'Market cap', width: 'minmax(100px, 1fr)', align: 'right', render: (r) => <span className="num">{formatCompactCurrency(r.ticker.marketCap)}</span>, sortValue: (r) => r.ticker.marketCap }
    ],
    [period]
  )

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md border border-border bg-surface-2 p-0.5">
          {PERIODS.map((p) => (
            <Tooltip key={p.value} content={p.hint}>
              <button type="button" onClick={() => setPeriod(p.value)} className={cn('h-6 rounded-sm px-2.5 text-[11px] font-medium', period === p.value ? 'bg-accent-soft text-accent' : 'text-fg-muted hover:text-fg')}>
                {p.label}
              </button>
            </Tooltip>
          ))}
        </div>
        <div className="inline-flex rounded-md border border-border bg-surface-2 p-0.5">
          {(['ranking', 'heatmap'] as const).map((v) => (
            <button key={v} type="button" onClick={() => setView(v)} className={cn('h-6 rounded-sm px-2.5 text-[11px] font-medium capitalize', view === v ? 'bg-accent-soft text-accent' : 'text-fg-muted hover:text-fg')}>
              {v}
            </button>
          ))}
        </div>
        <span className="text-xs text-fg-muted">{rows.length} assets</span>
        <label className="ml-2 flex items-center gap-1.5 text-xs text-fg-muted">
          <Switch checked={hideStable} onCheckedChange={setHideStable} /> Hide stablecoins
        </label>
        <div className="ml-auto flex items-center gap-2 text-xs text-fg-muted">
          {progress.running ? (
            <span>
              Computing {progress.done}/{progress.total}…
            </span>
          ) : (
            <span>{updatedAt ? `Computed ${formatRelativeTime(updatedAt)}` : 'Waiting for candles…'}</span>
          )}
          <Button size="icon" variant="ghost" aria-label="Recompute" disabled={progress.running} onClick={() => void api.analytics.refresh()}>
            <RefreshCw className={cn('h-3.5 w-3.5', progress.running && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {view === 'ranking' ? (
        <VirtualTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.ticker.assetId}
          defaultSort={{ key: 'vol', dir: 'desc' }}
          onRowClick={(r) => navigate({ page: 'asset', assetId: r.ticker.assetId })}
          emptyMessage={progress.running ? 'Computing volatility for the market universe…' : 'No volatility data yet. Metrics are computed from candle history a few seconds after start-up.'}
          className="min-h-0 flex-1"
        />
      ) : (
        <Panel title={`Volatility heatmap · tile size = market cap · colour = ${PERIODS.find((p) => p.value === period)!.label} volatility`} padded={false} className="min-h-0 flex-1">
          <VolatilityHeatmap rows={rows} period={period} className="h-full w-full" />
        </Panel>
      )}
      <p className="shrink-0 text-[10px] text-fg-subtle">Realised volatility is a statistic of past price movement. It is not a prediction of future price movement.</p>
    </div>
  )
}

function Percentile({ value }: { value: number | null }) {
  if (value == null) return <span className="num text-fg-subtle">—</span>
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-1.5 w-10 overflow-hidden rounded-sm bg-surface-3">
        <span className="block h-full bg-accent" style={{ width: `${value}%` }} />
      </span>
      <span className="num w-7 text-right">{value.toFixed(0)}</span>
    </span>
  )
}
