import { useMemo, useState } from 'react'
import { History as HistoryIcon, Play } from 'lucide-react'
import { HISTORY_METRIC_META, type HistoryCondition, type HistoryDirection, type HistoryMetric, type HistoryOccurrence, type HistoryResult } from '@shared/analysis/history'
import { useMarketStore } from '@/stores/marketStore'
import { api, errorMessage } from '@/lib/api'
import { AssetSearch } from '@/components/market/AssetSearch'
import { AssetCell } from '@/components/market/AssetCell'
import { PctChange } from '@/components/market/PctChange'
import { VirtualTable, type Column } from '@/components/table/VirtualTable'
import { KpiTile } from '@/components/dashboard/widgets'
import { Panel } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency, formatDate, formatPercent } from '@/lib/format'
import { cn } from '@/lib/cn'

const METRIC_OPTIONS = (Object.keys(HISTORY_METRIC_META) as HistoryMetric[]).map((m) => ({ value: m, label: HISTORY_METRIC_META[m].label }))
const HORIZONS = [1, 3, 7, 14, 30]

interface Study {
  assetId: string
  symbol: string
  condition: HistoryCondition
  horizon: number
  result: HistoryResult
  source: string
  stale: boolean
  from: number
  to: number
}

export function HistoryPage() {
  const byId = useMarketStore((s) => s.byId)
  const [assetId, setAssetId] = useState('bitcoin')
  const [metric, setMetric] = useState<HistoryMetric>('vol7d')
  const [direction, setDirection] = useState<HistoryDirection>('above')
  const [threshold, setThreshold] = useState('80')
  const [horizon, setHorizon] = useState(7)
  const [study, setStudy] = useState<Study | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ticker = byId[assetId]
  const meta = HISTORY_METRIC_META[metric]
  const th = Number(threshold)
  const valid = !!ticker && Number.isFinite(th)

  const run = async () => {
    if (!valid || !ticker) return
    setLoading(true)
    setError(null)
    try {
      const condition: HistoryCondition = { metric, direction, threshold: th }
      const r = await api.history.analyse(assetId, condition, horizon)
      setStudy({ assetId, symbol: ticker.symbol, condition, horizon, ...r })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const columns = useMemo<Column<HistoryOccurrence>[]>(
    () => [
      { key: 'date', header: 'Date', width: '120px', render: (o) => <span className="num text-fg-muted">{formatDate(o.time * 1000)}</span>, sortValue: (o) => o.time },
      { key: 'metric', header: meta.label, width: 'minmax(120px, 1fr)', align: 'right', render: (o) => <span className="num">{o.metricValue.toFixed(1)}{meta.unit}</span>, sortValue: (o) => o.metricValue },
      { key: 'entry', header: 'Close then', width: 'minmax(100px, 1fr)', align: 'right', render: (o) => <span className="num">{formatCurrency(o.entryClose)}</span>, sortValue: (o) => o.entryClose },
      { key: 'exit', header: `Close +${study?.horizon ?? horizon}d`, width: 'minmax(100px, 1fr)', align: 'right', render: (o) => <span className="num">{formatCurrency(o.exitClose)}</span>, sortValue: (o) => o.exitClose },
      { key: 'ret', header: 'Return', width: '90px', align: 'right', render: (o) => <PctChange value={o.returnPct} />, sortValue: (o) => o.returnPct },
      { key: 'mfe', header: 'Max gain', width: '90px', align: 'right', title: 'Highest high within the horizon vs entry close', render: (o) => <PctChange value={o.maxGainPct} />, sortValue: (o) => o.maxGainPct },
      { key: 'mae', header: 'Max loss', width: '90px', align: 'right', title: 'Lowest low within the horizon vs entry close', render: (o) => <PctChange value={o.maxLossPct} />, sortValue: (o) => o.maxLossPct }
    ],
    [meta, study, horizon]
  )

  const r = study?.result

  return (
    <div className="flex h-full flex-col gap-3">
      <Panel title="Historical condition">
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-64 space-y-1 text-xs text-fg-muted">
            <span>Asset</span>
            {ticker ? (
              <div className="flex h-7 items-center justify-between rounded-md border border-border bg-surface-2 px-2.5">
                <AssetCell ticker={ticker} />
                <button type="button" className="text-[11px] text-accent hover:underline" onClick={() => setAssetId('')}>change</button>
              </div>
            ) : (
              <AssetSearch placeholder="Select asset…" onSelect={(t) => setAssetId(t.assetId)} />
            )}
          </div>
          <label className="space-y-1 text-xs text-fg-muted">
            <span>When</span>
            <Select value={metric} options={METRIC_OPTIONS} onValueChange={setMetric} className="w-60" />
          </label>
          <div className="space-y-1 text-xs text-fg-muted">
            <span>is</span>
            <div className="inline-flex h-7 rounded-md border border-border bg-surface-2 p-0.5">
              {(['above', 'below'] as const).map((d) => (
                <button key={d} type="button" onClick={() => setDirection(d)} className={cn('rounded-sm px-2.5 text-[11px] font-medium', direction === d ? 'bg-accent-soft text-accent' : 'text-fg-muted hover:text-fg')}>{d}</button>
              ))}
            </div>
          </div>
          <label className="space-y-1 text-xs text-fg-muted">
            <span>Threshold {meta.unit && `(${meta.unit})`}</span>
            <Input type="number" step="any" value={threshold} onChange={(e) => setThreshold(e.target.value)} className="num w-28" />
          </label>
          <label className="space-y-1 text-xs text-fg-muted">
            <span>Following</span>
            <Select value={String(horizon)} options={HORIZONS.map((h) => ({ value: String(h), label: `${h} day${h === 1 ? '' : 's'}` }))} onValueChange={(v) => setHorizon(Number(v))} className="w-28" />
          </label>
          <Button variant="primary" size="md" disabled={!valid || loading} onClick={() => void run()}>
            <Play className="h-3.5 w-3.5" /> {loading ? 'Analysing…' : 'Analyse'}
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-fg-muted">{meta.description}. Uses daily candles (up to ~2.7 years). Consecutive days meeting the condition count as one occurrence.</p>
        {error && <div className="mt-2 text-xs text-negative">{error}</div>}
      </Panel>

      {!study || !r ? (
        <EmptyState icon={HistoryIcon} title="Investigate a historical condition" description='Example: "When BTC 7-day volatility exceeded 80%, what happened over the following 7 days?" Results are historical observations, not predictions.' />
      ) : (
        <>
          <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs text-fg-muted">
            <Badge tone="accent">Historical observation</Badge>
            <span>
              {study.symbol} · {formatDate(study.from * 1000)} – {formatDate(study.to * 1000)} · {r.candlesAnalysed} daily candles · {study.source}
            </span>
            {study.stale && <Badge tone="warning">Cached data</Badge>}
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
            <KpiTile label="Occurrences" value={String(r.count)} sub={`with ${study.horizon}d of data after`} />
            <KpiTile label="Avg subsequent return" value={formatPercent(r.meanReturnPct)} tone={r.meanReturnPct != null && r.meanReturnPct > 0 ? 'positive' : r.meanReturnPct != null && r.meanReturnPct < 0 ? 'negative' : 'neutral'} sub={`Unconditional avg ${formatPercent(r.baselineMeanReturnPct)}`} />
            <KpiTile label="Median return" value={formatPercent(r.medianReturnPct)} tone={r.medianReturnPct != null && r.medianReturnPct > 0 ? 'positive' : r.medianReturnPct != null && r.medianReturnPct < 0 ? 'negative' : 'neutral'} sub={r.stdDevPct != null ? `Std dev ${r.stdDevPct.toFixed(1)}%` : undefined} />
            <KpiTile label="Positive / negative" value={`${r.positive} / ${r.negative}`} sub={r.positiveSharePct != null ? `${r.positiveSharePct.toFixed(0)}% positive` : undefined} />
            <KpiTile label="Max subsequent gain" value={formatPercent(r.maxReturnPct)} tone="positive" sub="Best close-to-close outcome" />
            <KpiTile label="Max subsequent loss" value={formatPercent(r.minReturnPct)} tone="negative" sub="Worst close-to-close outcome" />
            <KpiTile label="Avg max excursion up" value={formatPercent(r.avgMaxGainPct)} sub="Highest high within horizon" />
            <KpiTile label="Avg max excursion down" value={formatPercent(r.avgMaxLossPct)} sub="Lowest low within horizon" />
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-12 gap-3">
            <Panel title="Distribution of subsequent returns" className="col-span-12 xl:col-span-4">
              <Distribution buckets={r.distribution} />
            </Panel>
            <VirtualTable columns={columns} rows={r.occurrences} rowKey={(o) => String(o.index)} defaultSort={{ key: 'date', dir: 'desc' }} className="col-span-12 min-h-[240px] xl:col-span-8" emptyMessage="The condition never occurred in the available history." />
          </div>
          <p className="shrink-0 text-[10px] text-fg-subtle">These statistics describe what happened after past occurrences in the analysed period. Past behaviour does not predict future returns; sample sizes are often small and regimes change.</p>
        </>
      )}
    </div>
  )
}

function Distribution({ buckets }: { buckets: { from: number; to: number; count: number }[] }) {
  if (!buckets.length) return <div className="text-xs text-fg-muted">No occurrences.</div>
  const max = Math.max(...buckets.map((b) => b.count))
  return (
    <div className="flex h-44 items-end gap-1">
      {buckets.map((b) => (
        <div key={b.from} className="flex min-w-0 flex-1 flex-col items-center gap-1" title={`${b.from.toFixed(1)}% to ${b.to.toFixed(1)}%: ${b.count}`}>
          <span className="num text-[10px] text-fg-muted">{b.count || ''}</span>
          <div className={cn('w-full rounded-sm', b.to <= 0 ? 'bg-negative/70' : b.from >= 0 ? 'bg-positive/70' : 'bg-fg-subtle/60')} style={{ height: `${max ? (b.count / max) * 100 : 0}%`, minHeight: b.count ? 2 : 0 }} />
          <span className="num w-full truncate text-center text-[9px] text-fg-subtle">{b.from > 0 ? '+' : ''}{Number.isInteger(b.from) ? b.from : b.from.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  )
}
