import { useState } from 'react'
import { LineChart } from 'lucide-react'
import { useMarketStore } from '@/stores/marketStore'
import { AssetSearch } from '@/components/market/AssetSearch'
import { AssetCell } from '@/components/market/AssetCell'
import { AssetChartView } from '@/components/chart/AssetChartView'
import { PctChange } from '@/components/market/PctChange'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency } from '@/lib/format'

/** Technical Analysis workspace: pick any asset, chart it with indicators, read the current values. */
export function AnalysisPage() {
  const [assetId, setAssetId] = useState<string>('bitcoin')
  const ticker = useMarketStore((s) => s.byId[assetId])
  const loading = useMarketStore((s) => s.loading)

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex shrink-0 items-center gap-3">
        <AssetSearch className="w-72" placeholder="Select asset…" onSelect={(t) => setAssetId(t.assetId)} />
        {ticker && (
          <div className="flex items-center gap-3 text-sm">
            <AssetCell ticker={ticker} />
            <span className="num font-semibold">{formatCurrency(ticker.price)}</span>
            <PctChange value={ticker.change24hPct} />
          </div>
        )}
      </div>
      {ticker ? (
        <AssetChartView key={assetId} assetId={assetId} />
      ) : (
        <EmptyState icon={LineChart} title={loading ? 'Loading market data…' : 'Select an asset to analyse'} />
      )}
    </div>
  )
}
