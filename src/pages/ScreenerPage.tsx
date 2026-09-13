import { useEffect, useMemo, useState } from 'react'
import { Bookmark, Filter, Save, Trash2 } from 'lucide-react'
import type { Ticker } from '@shared/types'
import { describeScreen, runScreen, SCREEN_PRESETS, type ScreenDefinition } from '@shared/analysis/screener'
import { useMarketStore } from '@/stores/marketStore'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useScreenStore } from '@/stores/screenStore'
import { useUiStore } from '@/stores/uiStore'
import { ConditionEditor } from '@/components/screener/ConditionEditor'
import { VirtualTable, type Column } from '@/components/table/VirtualTable'
import { AssetCell } from '@/components/market/AssetCell'
import { PctChange } from '@/components/market/PctChange'
import { WatchStar } from '@/components/market/WatchStar'
import { VolPct } from '@/pages/VolatilityPage'
import { Panel } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { formatCompactCurrency, formatCurrency } from '@/lib/format'
import { cn } from '@/lib/cn'

const EMPTY: ScreenDefinition = { logic: 'and', conditions: [] }

export function ScreenerPage() {
  const tickers = useMarketStore((s) => s.tickers)
  const metrics = useAnalyticsStore((s) => s.metrics)
  const progress = useAnalyticsStore((s) => s.progress)
  const navigate = useUiStore((s) => s.navigate)
  const { saved, load, create, update, remove, error } = useScreenStore()

  const [definition, setDefinition] = useState<ScreenDefinition>(SCREEN_PRESETS[0]!.definition)
  const [activeName, setActiveName] = useState<string>(SCREEN_PRESETS[0]!.name)
  const [activeSavedId, setActiveSavedId] = useState<number | null>(null)
  const [saveDialog, setSaveDialog] = useState<string | null>(null)

  useEffect(() => void load(), [load])

  const results = useMemo(() => runScreen(definition, tickers, metrics), [definition, tickers, metrics])
  const withMetrics = useMemo(() => tickers.filter((t) => metrics[t.assetId]).length, [tickers, metrics])

  const columns = useMemo<Column<Ticker>[]>(
    () => [
      { key: 'star', header: '', width: '40px', align: 'center', render: (t) => <WatchStar assetId={t.assetId} className="align-middle" /> },
      { key: 'rank', header: '#', width: '44px', align: 'right', render: (t) => <span className="num text-fg-muted">{t.rank ?? '—'}</span>, sortValue: (t) => t.rank },
      { key: 'asset', header: 'Asset', width: 'minmax(170px, 2fr)', render: (t) => <AssetCell ticker={t} />, sortValue: (t) => t.symbol },
      { key: 'price', header: 'Price', width: 'minmax(100px, 1fr)', align: 'right', render: (t) => <span className="num">{formatCurrency(t.price)}</span>, sortValue: (t) => t.price },
      { key: 'c24h', header: '24h', width: '80px', align: 'right', render: (t) => <PctChange value={t.change24hPct} />, sortValue: (t) => t.change24hPct },
      { key: 'c7d', header: '7d', width: '80px', align: 'right', render: (t) => <PctChange value={t.change7dPct} />, sortValue: (t) => t.change7dPct },
      { key: 'vol', header: 'Vol 7d', width: '92px', align: 'right', render: (t) => <VolPct value={metrics[t.assetId]?.vol7d} />, sortValue: (t) => metrics[t.assetId]?.vol7d ?? null },
      { key: 'volr', header: 'Vol/avg', width: '76px', align: 'right', title: '24h volume vs 30-day average', render: (t) => <Ratio value={metrics[t.assetId]?.volumeRatio} />, sortValue: (t) => metrics[t.assetId]?.volumeRatio ?? null },
      { key: 'rsi', header: 'RSI', width: '60px', align: 'right', render: (t) => <span className="num">{metrics[t.assetId]?.rsi14?.toFixed(0) ?? '—'}</span>, sortValue: (t) => metrics[t.assetId]?.rsi14 ?? null },
      { key: 'mcap', header: 'Market cap', width: 'minmax(100px, 1fr)', align: 'right', render: (t) => <span className="num">{formatCompactCurrency(t.marketCap)}</span>, sortValue: (t) => t.marketCap },
      { key: 'volume', header: 'Volume 24h', width: 'minmax(100px, 1fr)', align: 'right', render: (t) => <span className="num">{formatCompactCurrency(t.volume24h)}</span>, sortValue: (t) => t.volume24h }
    ],
    [metrics]
  )

  const selectPreset = (name: string, def: ScreenDefinition, savedId: number | null = null) => {
    setDefinition(structuredClone(def))
    setActiveName(name)
    setActiveSavedId(savedId)
  }

  const saveCurrent = async (name: string) => {
    if (activeSavedId) await update(activeSavedId, { name, definition })
    else {
      const s = await create(name, definition)
      if (s) setActiveSavedId(s.id)
    }
    setActiveName(name)
  }

  return (
    <div className="flex h-full gap-3">
      <aside className="flex w-60 shrink-0 flex-col gap-3">
        <Panel title="Presets" padded={false}>
          <ul className="py-1">
            {SCREEN_PRESETS.map((p) => (
              <li key={p.name}>
                <button
                  type="button"
                  onClick={() => selectPreset(p.name, p.definition)}
                  title={p.description}
                  className={cn('flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px]', activeName === p.name && activeSavedId === null ? 'bg-accent-soft text-fg' : 'text-fg-muted hover:bg-surface-2 hover:text-fg')}
                >
                  <Filter className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{p.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Saved screens" padded={false} className="min-h-0 flex-1">
          {saved.length === 0 ? (
            <div className="p-3 text-xs text-fg-muted">Build a screen and click Save to keep it here.</div>
          ) : (
            <ul className="py-1">
              {saved.map((s) => (
                <li key={s.id} className="group flex items-center">
                  <button
                    type="button"
                    onClick={() => selectPreset(s.name, s.definition, s.id)}
                    title={describeScreen(s.definition)}
                    className={cn('flex min-w-0 flex-1 items-center gap-2 px-3 py-1.5 text-left text-[13px]', activeSavedId === s.id ? 'bg-accent-soft text-fg' : 'text-fg-muted hover:bg-surface-2 hover:text-fg')}
                  >
                    <Bookmark className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{s.name}</span>
                  </button>
                  <Button size="icon" variant="ghost" aria-label="Delete screen" className="mr-1 opacity-0 group-hover:opacity-100" onClick={() => void remove(s.id).then(() => activeSavedId === s.id && selectPreset('Custom', EMPTY))}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <Panel
          title={activeName}
          actions={
            <>
              <Button size="sm" variant="ghost" onClick={() => selectPreset('Custom', EMPTY)}>
                Clear
              </Button>
              <Button size="sm" variant="primary" onClick={() => setSaveDialog(activeSavedId ? activeName : '')} disabled={definition.conditions.length === 0}>
                <Save className="h-3.5 w-3.5" /> {activeSavedId ? 'Save changes' : 'Save as…'}
              </Button>
            </>
          }
        >
          <ConditionEditor value={definition} onChange={setDefinition} />
          {error && <div className="mt-2 text-xs text-negative">{error}</div>}
        </Panel>

        <div className="flex shrink-0 items-center gap-3 text-xs text-fg-muted">
          <span>
            <span className="num font-semibold text-fg">{results.length}</span> matching assets
          </span>
          <span>·</span>
          <span>
            {withMetrics}/{tickers.length} assets have metrics{progress.running ? ` (computing ${progress.done}/${progress.total}…)` : ''}
          </span>
          <span className="ml-auto text-[10px] text-fg-subtle">Screens describe current market conditions. They are not trading signals.</span>
        </div>

        <VirtualTable
          columns={columns}
          rows={results}
          rowKey={(t) => t.assetId}
          defaultSort={{ key: 'mcap', dir: 'desc' }}
          onRowClick={(t) => navigate({ page: 'asset', assetId: t.assetId })}
          emptyMessage={definition.conditions.length === 0 ? 'Add a condition to start screening.' : 'No assets match these conditions right now.'}
          className="min-h-0 flex-1"
        />
      </div>

      <Dialog
        open={saveDialog !== null}
        onOpenChange={(o) => !o && setSaveDialog(null)}
        title={activeSavedId ? 'Save changes' : 'Save screen'}
        description={describeScreen(definition)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSaveDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!saveDialog?.trim()}
              onClick={() => {
                void saveCurrent(saveDialog!.trim())
                setSaveDialog(null)
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!saveDialog?.trim()) return
            void saveCurrent(saveDialog.trim())
            setSaveDialog(null)
          }}
        >
          <Input autoFocus value={saveDialog ?? ''} maxLength={60} placeholder="Screen name" onChange={(e) => setSaveDialog(e.target.value)} />
        </form>
      </Dialog>
    </div>
  )
}

function Ratio({ value }: { value: number | null | undefined }) {
  if (value == null) return <span className="num text-fg-subtle">—</span>
  return <span className={cn('num', value >= 2 && 'text-warning')}>{value.toFixed(2)}×</span>
}
