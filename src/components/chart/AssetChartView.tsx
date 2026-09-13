import { useState } from 'react'
import type { Timeframe } from '@shared/types'
import { useOHLCV } from '@/hooks/useOHLCV'
import { useIndicators } from '@/hooks/useIndicators'
import { useChartStore } from '@/stores/chartStore'
import { IndicatorChart } from './IndicatorChart'
import { IndicatorPanel } from './IndicatorPanel'
import { IndicatorReadings } from './IndicatorReadings'
import { TimeframeSelector } from './TimeframeSelector'
import { Panel } from '@/components/ui/Panel'
import { Badge } from '@/components/ui/Badge'
import { formatRelativeTime } from '@/lib/format'

const EMPTY: never[] = []

interface Props {
  assetId: string
  initialTimeframe?: Timeframe
  showReadings?: boolean
  chartClassName?: string
}

/** Chart + indicator controls + readings; shared by the asset page and the Technical Analysis page. */
export function AssetChartView({ assetId, initialTimeframe = '1d', showReadings = true, chartClassName }: Props) {
  const [timeframe, setTimeframe] = useState<Timeframe>(initialTimeframe)
  const { data, loading, error } = useOHLCV(assetId, timeframe)
  const config = useChartStore((s) => s.indicators)
  const candles = data?.candles ?? EMPTY
  const indicators = useIndicators(candles, config)

  return (
    <>
      <Panel
        title="Price chart (USD)"
        padded={false}
        className={chartClassName ?? 'min-h-[420px] flex-1'}
        actions={
          <>
            {data && (
              <span className="mr-2 text-[11px] text-fg-subtle">
                {data.candles.length} candles · {data.source}
                {data.updatedAt ? ` · ${formatRelativeTime(data.updatedAt)}` : ''}
              </span>
            )}
            {data?.stale && <Badge tone="warning">Cached</Badge>}
            <IndicatorPanel />
            <TimeframeSelector value={timeframe} onChange={setTimeframe} />
          </>
        }
      >
        <div className="relative h-full min-h-[380px]">
          {candles.length > 0 && <IndicatorChart candles={candles} config={config} indicators={indicators} className="absolute inset-0" />}
          {loading && !data && <div className="absolute inset-0 flex items-center justify-center text-xs text-fg-muted">Loading candles…</div>}
          {error && !data && <div className="absolute inset-0 flex items-center justify-center text-xs text-warning">{error}</div>}
        </div>
      </Panel>
      {showReadings && (
        <Panel title={`Indicator readings · ${timeframe}`} className="shrink-0">
          {candles.length > 0 ? <IndicatorReadings candles={candles} /> : <div className="text-xs text-fg-muted">Readings appear once candles are loaded.</div>}
          <p className="mt-2 text-[10px] text-fg-subtle">Indicator readings are descriptive statistics of past price data, not trading recommendations.</p>
        </Panel>
      )}
    </>
  )
}
