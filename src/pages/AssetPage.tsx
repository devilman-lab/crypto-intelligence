import { useState } from 'react'
import type { Timeframe } from '@shared/types'
import { useMarketStore } from '@/stores/marketStore'
import { useOHLCV } from '@/hooks/useOHLCV'
import { CandleChart } from '@/components/chart/CandleChart'
import { TimeframeSelector } from '@/components/chart/TimeframeSelector'
import { PctChange } from '@/components/market/PctChange'
import { Panel } from '@/components/ui/Panel'
import { Badge } from '@/components/ui/Badge'
import { formatCompactCurrency, formatCurrency, formatDate, formatRelativeTime } from '@/lib/format'

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-[110px]">
      <div className="text-[10px] uppercase tracking-wide text-fg-subtle">{label}</div>
      <div className="num text-[13px]">{children}</div>
    </div>
  )
}

export function AssetPage({ assetId }: { assetId: string }) {
  const ticker = useMarketStore((s) => s.byId[assetId])
  const [timeframe, setTimeframe] = useState<Timeframe>('1d')
  const { data, loading, error } = useOHLCV(assetId, timeframe)

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-end gap-x-6 gap-y-2 rounded-lg border border-border bg-surface px-4 py-3">
        <div className="mr-2">
          <div className="text-[10px] uppercase tracking-wide text-fg-subtle">Price</div>
          <div className="num text-2xl font-semibold leading-tight">{formatCurrency(ticker?.price)}</div>
          <div className="flex items-center gap-2 text-xs">
            <PctChange value={ticker?.change24hPct} /> <span className="text-fg-subtle">24h</span>
          </div>
        </div>
        <Stat label="Market cap">{formatCompactCurrency(ticker?.marketCap)}</Stat>
        <Stat label="Volume 24h">{formatCompactCurrency(ticker?.volume24h)}</Stat>
        <Stat label="24h high">{formatCurrency(ticker?.high24h)}</Stat>
        <Stat label="24h low">{formatCurrency(ticker?.low24h)}</Stat>
        <Stat label="7d">
          <PctChange value={ticker?.change7dPct} />
        </Stat>
        <Stat label="30d">
          <PctChange value={ticker?.change30dPct} />
        </Stat>
        <Stat label="All-time high">
          {formatCurrency(ticker?.ath)} {ticker?.athDate && <span className="text-fg-subtle">({formatDate(ticker.athDate)})</span>}
        </Stat>
        {ticker?.rank && <Badge className="ml-auto">Rank #{ticker.rank}</Badge>}
      </div>

      <Panel
        title="Price chart"
        padded={false}
        className="min-h-[360px] flex-1"
        actions={
          <>
            {data && (
              <span className="mr-2 text-[11px] text-fg-subtle">
                {data.candles.length} candles · {data.source}
                {data.updatedAt ? ` · ${formatRelativeTime(data.updatedAt)}` : ''}
              </span>
            )}
            {data?.stale && <Badge tone="warning">Cached</Badge>}
            <TimeframeSelector value={timeframe} onChange={setTimeframe} />
          </>
        }
      >
        <div className="relative h-full min-h-[320px]">
          {data && data.candles.length > 0 && <CandleChart candles={data.candles} className="absolute inset-0" />}
          {loading && !data && <div className="absolute inset-0 flex items-center justify-center text-xs text-fg-muted">Loading candles…</div>}
          {error && !data && <div className="absolute inset-0 flex items-center justify-center text-xs text-warning">{error}</div>}
        </div>
      </Panel>

      <Panel title="Technical indicators" className="shrink-0">
        <div className="text-xs text-fg-muted">Indicator overlays and oscillators (SMA, EMA, RSI, MACD, Bollinger Bands, ATR, Stochastic, VWAP) arrive in Phase 4.</div>
      </Panel>
    </div>
  )
}
