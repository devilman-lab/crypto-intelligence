import { useMemo } from 'react'
import { Bell, Briefcase, FlaskConical } from 'lucide-react'
import type { Ticker } from '@shared/types'
import { useMarketStore } from '@/stores/marketStore'
import { useWatchlistStore } from '@/stores/watchlistStore'
import { useUiStore } from '@/stores/uiStore'
import { KpiTile, TickerList } from '@/components/dashboard/widgets'
import { Panel } from '@/components/ui/Panel'
import { PctChange } from '@/components/market/PctChange'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCompactCurrency, formatCurrency, formatPercent } from '@/lib/format'

/** Assets with meaningful liquidity; avoids tiny illiquid names topping the lists. */
const MIN_VOLUME = 5_000_000

export function DashboardPage() {
  const tickers = useMarketStore((s) => s.tickers)
  const byId = useMarketStore((s) => s.byId)
  const loading = useMarketStore((s) => s.loading)
  const lists = useWatchlistStore((s) => s.lists)
  const navigate = useUiStore((s) => s.navigate)

  const btc = byId['bitcoin']
  const eth = byId['ethereum']

  const { gainers, losers, volume, trend } = useMemo(() => {
    const liquid = tickers.filter((t) => (t.volume24h ?? 0) >= MIN_VOLUME && t.change24hPct != null)
    const byChange = [...liquid].sort((a, b) => (b.change24hPct ?? 0) - (a.change24hPct ?? 0))
    const top100 = [...tickers].filter((t) => t.rank != null && t.change24hPct != null).sort((a, b) => a.rank! - b.rank!).slice(0, 100)
    const up = top100.filter((t) => (t.change24hPct ?? 0) > 0).length
    const avg = top100.length ? top100.reduce((s, t) => s + (t.change24hPct ?? 0), 0) / top100.length : null
    const totalVol = tickers.reduce((s, t) => s + (t.volume24h ?? 0), 0)
    const totalCap = tickers.reduce((s, t) => s + (t.marketCap ?? 0), 0)
    const btcDominance = totalCap && btc?.marketCap ? (btc.marketCap / totalCap) * 100 : null
    return {
      gainers: byChange.slice(0, 6),
      losers: byChange.slice(-6).reverse(),
      volume: [...tickers].sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0)).slice(0, 6),
      trend: { up, total: top100.length, avg, totalVol, totalCap, btcDominance }
    }
  }, [tickers, btc])

  const watchTickers = useMemo<Ticker[]>(() => {
    const seen = new Set<string>()
    const out: Ticker[] = []
    for (const l of lists) for (const i of l.items) if (!seen.has(i.assetId) && byId[i.assetId]) { seen.add(i.assetId); out.push(byId[i.assetId]!) }
    return out.slice(0, 8)
  }, [lists, byId])

  const breadthPct = trend.total ? (trend.up / trend.total) * 100 : null
  const trendLabel = breadthPct == null ? '—' : breadthPct >= 60 ? 'Broadly up' : breadthPct <= 40 ? 'Broadly down' : 'Mixed'
  const trendTone = breadthPct == null ? 'neutral' : breadthPct >= 60 ? 'positive' : breadthPct <= 40 ? 'negative' : 'neutral'

  return (
    <div className="grid auto-rows-min grid-cols-12 gap-3">
      {/* KPI row */}
      <div className="col-span-12 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiTile label="Portfolio value" value="—" sub="Set up in Portfolio" onClick={() => navigate({ page: 'portfolio' })} />
        <KpiTile label="Today's P&L" value="—" sub="No holdings yet" />
        <KpiTile label="Total P&L" value="—" sub="No holdings yet" />
        <KpiTile label="Bitcoin" value={formatCurrency(btc?.price)} sub={<PctChange value={btc?.change24hPct} />} onClick={() => navigate({ page: 'asset', assetId: 'bitcoin' })} />
        <KpiTile label="Ethereum" value={formatCurrency(eth?.price)} sub={<PctChange value={eth?.change24hPct} />} onClick={() => navigate({ page: 'asset', assetId: 'ethereum' })} />
        <KpiTile
          label="Market trend (24h)"
          value={trendLabel}
          tone={trendTone}
          sub={breadthPct == null ? 'Waiting for data' : `${trend.up}/${trend.total} up · avg ${formatPercent(trend.avg)}`}
        />
      </div>

      {/* Market snapshot strip */}
      <Panel className="col-span-12" padded={false}>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-3 py-2 text-xs text-fg-muted">
          <span>
            Tracked market cap <span className="num text-fg">{formatCompactCurrency(trend.totalCap)}</span>
          </span>
          <span>
            24h volume <span className="num text-fg">{formatCompactCurrency(trend.totalVol)}</span>
          </span>
          <span>
            BTC dominance <span className="num text-fg">{trend.btcDominance != null ? `${trend.btcDominance.toFixed(1)}%` : '—'}</span>
          </span>
          <span>
            Assets tracked <span className="num text-fg">{tickers.length}</span>
          </span>
          {loading && <span className="ml-auto">Loading market data…</span>}
        </div>
      </Panel>

      <TickerList title="Top gainers (24h)" tickers={gainers} metricHeader="24h" metric={(t) => <PctChange value={t.change24hPct} />} className="col-span-12 md:col-span-6 xl:col-span-4" emptyText={loading ? 'Loading…' : 'No data'} />
      <TickerList title="Top losers (24h)" tickers={losers} metricHeader="24h" metric={(t) => <PctChange value={t.change24hPct} />} className="col-span-12 md:col-span-6 xl:col-span-4" emptyText={loading ? 'Loading…' : 'No data'} />
      <TickerList title="Highest volume" tickers={volume} metricHeader="Volume" metric={(t) => formatCompactCurrency(t.volume24h)} className="col-span-12 md:col-span-6 xl:col-span-4" emptyText={loading ? 'Loading…' : 'No data'} />

      <TickerList
        title="Watchlist"
        tickers={watchTickers}
        metricHeader="24h"
        metric={(t) => <PctChange value={t.change24hPct} />}
        className="col-span-12 md:col-span-6 xl:col-span-4"
        emptyText="Your watchlists are empty. Star assets in Markets to see them here."
        actions={
          <Button size="xs" variant="ghost" onClick={() => navigate({ page: 'watchlist' })}>
            Manage
          </Button>
        }
      />
      <Panel title="Highest volatility (30d)" className="col-span-12 md:col-span-6 xl:col-span-4" padded={false}>
        <div className="p-4 text-center text-xs text-fg-muted">Volatility ranking arrives with the volatility engine (Phase 5).</div>
      </Panel>
      <Panel title="Active alerts" className="col-span-12 md:col-span-6 xl:col-span-4" padded={false}>
        <EmptyState icon={Bell} title="No alerts yet" description="Price, volatility, volume and RSI alerts arrive in Phase 10." />
      </Panel>
      <Panel title="Recent paper trades" className="col-span-12 md:col-span-6 xl:col-span-4" padded={false}>
        <EmptyState icon={FlaskConical} title="No simulated trades" description="Paper trading arrives in Phase 8." />
      </Panel>
      <Panel title="Portfolio allocation" className="col-span-12 md:col-span-6 xl:col-span-4" padded={false}>
        <EmptyState icon={Briefcase} title="No portfolio yet" description="Portfolio tracking arrives in Phase 7." />
      </Panel>
    </div>
  )
}
