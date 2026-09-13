import { useMarketStore } from '@/stores/marketStore'
import { AssetChartView } from '@/components/chart/AssetChartView'
import { PctChange } from '@/components/market/PctChange'
import { Badge } from '@/components/ui/Badge'
import { WatchStar } from '@/components/market/WatchStar'
import { formatCompactCurrency, formatCurrency, formatDate } from '@/lib/format'

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
        <div className="ml-auto flex items-center gap-2">
          {ticker?.rank && <Badge>Rank #{ticker.rank}</Badge>}
          <WatchStar assetId={assetId} />
        </div>
      </div>

      <AssetChartView key={assetId} assetId={assetId} />
    </div>
  )
}
