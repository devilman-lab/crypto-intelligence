import { useEffect, useMemo, useState } from 'react'
import { NotebookPen, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import type { JournalEntry, JournalFilter, JournalResult, JournalSide } from '@shared/types'
import { filterEntries, journalStats } from '@shared/analysis/journal'
import { useJournalStore } from '@/stores/journalStore'
import { useMarketStore } from '@/stores/marketStore'
import { useDebounce } from '@/hooks/useDebounce'
import { JournalEntryDialog } from '@/components/journal/JournalEntryDialog'
import { VirtualTable, type Column } from '@/components/table/VirtualTable'
import { AssetCell } from '@/components/market/AssetCell'
import { PctChange } from '@/components/market/PctChange'
import { KpiTile } from '@/components/dashboard/widgets'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/EmptyState'
import { Panel } from '@/components/ui/Panel'
import { formatCurrency, formatDateTime, formatMoney, formatNumber } from '@/lib/format'
import { cn } from '@/lib/cn'

const RESULT_TONE: Record<JournalResult, 'positive' | 'negative' | 'neutral' | 'accent'> = { win: 'positive', loss: 'negative', breakeven: 'neutral', open: 'accent' }

function Pnl({ value }: { value: number | null }) {
  if (value == null) return <span className="num text-fg-subtle">open</span>
  return <span className={cn('num', value > 0 && 'text-positive', value < 0 && 'text-negative')}>{value > 0 ? '+' : ''}{formatMoney(value)}</span>
}

export function JournalPage() {
  const { entries, load, create, update, remove, error } = useJournalStore()
  const byId = useMarketStore((s) => s.byId)
  const [dialog, setDialog] = useState<{ open: boolean; initial: JournalEntry | null }>({ open: false, initial: null })
  const [filter, setFilter] = useState<JournalFilter>({})
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)

  useEffect(() => void load(), [load])

  const strategies = useMemo(() => [...new Set(entries.map((e) => e.strategy).filter(Boolean))].sort(), [entries])
  const assets = useMemo(() => [...new Map(entries.map((e) => [e.assetId, e.symbol])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [entries])
  const filtered = useMemo(() => filterEntries(entries, { ...filter, search: debouncedSearch }), [entries, filter, debouncedSearch])
  const stats = useMemo(() => journalStats(filtered), [filtered])

  const columns = useMemo<Column<JournalEntry>[]>(
    () => [
      { key: 'opened', header: 'Opened', width: '150px', render: (e) => <span className="num text-fg-muted">{formatDateTime(e.openedAt)}</span>, sortValue: (e) => e.openedAt },
      { key: 'asset', header: 'Asset', width: 'minmax(120px, 1.2fr)', render: (e) => (byId[e.assetId] ? <AssetCell ticker={byId[e.assetId]!} showName={false} /> : <span className="font-semibold">{e.symbol}</span>), sortValue: (e) => e.symbol },
      { key: 'side', header: 'Side', width: '64px', render: (e) => <Badge tone={e.side === 'long' ? 'positive' : 'negative'} className="uppercase">{e.side}</Badge>, sortValue: (e) => e.side },
      { key: 'strategy', header: 'Strategy', width: 'minmax(110px, 1.2fr)', render: (e) => <span className="truncate">{e.strategy || <span className="text-fg-subtle">—</span>}</span>, sortValue: (e) => e.strategy },
      { key: 'entry', header: 'Entry', width: 'minmax(90px, 1fr)', align: 'right', render: (e) => <span className="num">{formatCurrency(e.entryPrice)}</span>, sortValue: (e) => e.entryPrice },
      { key: 'exit', header: 'Exit', width: 'minmax(90px, 1fr)', align: 'right', render: (e) => <span className="num">{e.exitPrice != null ? formatCurrency(e.exitPrice) : '—'}</span>, sortValue: (e) => e.exitPrice },
      { key: 'size', header: 'Size', width: 'minmax(80px, 1fr)', align: 'right', render: (e) => <span className="num">{formatNumber(e.quantity, e.quantity >= 100 ? 2 : 4)}</span>, sortValue: (e) => e.quantity },
      { key: 'pnl', header: 'P&L', width: 'minmax(96px, 1fr)', align: 'right', render: (e) => <Pnl value={e.pnl} />, sortValue: (e) => e.pnl },
      { key: 'ret', header: 'Return', width: '80px', align: 'right', render: (e) => <PctChange value={e.pnl != null && e.entryPrice > 0 ? (e.pnl / (e.quantity * e.entryPrice)) * 100 : null} />, sortValue: (e) => (e.pnl != null && e.entryPrice > 0 ? e.pnl / (e.quantity * e.entryPrice) : null) },
      { key: 'result', header: 'Result', width: '86px', render: (e) => <Badge tone={RESULT_TONE[e.result]} className="capitalize">{e.result}</Badge>, sortValue: (e) => e.result },
      { key: 'emotion', header: 'Emotion', width: '86px', render: (e) => <span className="capitalize text-fg-muted">{e.emotion}</span>, sortValue: (e) => e.emotion },
      {
        key: 'actions',
        header: '',
        width: '72px',
        align: 'right',
        render: (e) => (
          <div className="flex justify-end gap-0.5" onClick={(ev) => ev.stopPropagation()}>
            <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setDialog({ open: true, initial: e })}><Pencil className="h-3.5 w-3.5" /></Button>
            <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => void remove(e.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        )
      }
    ],
    [byId, remove]
  )

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <div className="relative w-48">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notes, reasons, tags…" className="pl-7" />
        </div>
        <Select value={filter.assetId ?? ''} onValueChange={(v) => setFilter((f) => ({ ...f, assetId: v || undefined }))} options={[{ value: '', label: 'All assets' }, ...assets.map(([id, sym]) => ({ value: id, label: sym }))]} className="w-32" />
        <Select value={filter.strategy ?? ''} onValueChange={(v) => setFilter((f) => ({ ...f, strategy: v || undefined }))} options={[{ value: '', label: 'All strategies' }, ...strategies.map((s) => ({ value: s, label: s }))]} className="w-40" />
        <Select value={filter.side ?? ''} onValueChange={(v) => setFilter((f) => ({ ...f, side: (v || undefined) as JournalSide | undefined }))} options={[{ value: '', label: 'Long & short' }, { value: 'long', label: 'Long' }, { value: 'short', label: 'Short' }]} className="w-32" />
        <Select value={filter.result ?? ''} onValueChange={(v) => setFilter((f) => ({ ...f, result: (v || undefined) as JournalResult | undefined }))} options={[{ value: '', label: 'Any result' }, { value: 'win', label: 'Wins' }, { value: 'loss', label: 'Losses' }, { value: 'breakeven', label: 'Breakeven' }, { value: 'open', label: 'Open' }]} className="w-32" />
        <Input type="date" className="w-32" value={filter.from ? new Date(filter.from).toISOString().slice(0, 10) : ''} onChange={(e) => setFilter((f) => ({ ...f, from: e.target.value ? Date.parse(e.target.value) : undefined }))} aria-label="From date" />
        <Input type="date" className="w-32" value={filter.to ? new Date(filter.to).toISOString().slice(0, 10) : ''} onChange={(e) => setFilter((f) => ({ ...f, to: e.target.value ? Date.parse(e.target.value) + 86_399_999 : undefined }))} aria-label="To date" />
        <Button variant="primary" size="sm" className="ml-auto" onClick={() => setDialog({ open: true, initial: null })}>
          <Plus className="h-3.5 w-3.5" /> New entry
        </Button>
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <KpiTile label="Trades" value={String(stats.entries)} sub={`${stats.closed} closed · ${stats.entries - stats.closed} open`} />
        <KpiTile label="Win rate" value={stats.winRatePct != null ? `${stats.winRatePct.toFixed(0)}%` : '—'} sub={`${stats.wins}W / ${stats.losses}L / ${stats.breakeven}BE`} />
        <KpiTile label="Total P&L" value={<Pnl value={stats.closed ? stats.totalPnl : null} />} tone={stats.totalPnl > 0 ? 'positive' : stats.totalPnl < 0 ? 'negative' : 'neutral'} sub={`Fees ${formatMoney(stats.totalFees)}`} />
        <KpiTile label="Avg win" value={<Pnl value={stats.averageWin} />} />
        <KpiTile label="Avg loss" value={<Pnl value={stats.averageLoss} />} />
        <KpiTile label="Profit factor" value={stats.profitFactor == null ? '—' : stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)} sub="Gross profit ÷ gross loss" />
        <KpiTile label="Expectancy" value={<Pnl value={stats.expectancy} />} sub="Per closed trade" />
        <KpiTile label="Max drawdown" value={stats.maxDrawdown != null ? formatMoney(stats.maxDrawdown) : '—'} sub={`Best ${stats.bestTrade != null ? formatMoney(stats.bestTrade) : '—'} · worst ${stats.worstTrade != null ? formatMoney(stats.worstTrade) : '—'}`} />
      </div>

      {error && <div className="rounded-md border border-negative/40 bg-negative-soft px-3 py-2 text-xs text-negative">{error}</div>}

      {entries.length === 0 ? (
        <EmptyState icon={NotebookPen} title="Your journal is empty" description="Record each trade with its reasoning, result and how you felt. Over time the statistics reveal what actually works for you." action={<Button variant="primary" onClick={() => setDialog({ open: true, initial: null })}><Plus className="h-3.5 w-3.5" /> Add first entry</Button>} />
      ) : (
        <VirtualTable columns={columns} rows={filtered} rowKey={(e) => String(e.id)} defaultSort={{ key: 'opened', dir: 'desc' }} onRowClick={(e) => setDialog({ open: true, initial: e })} className="min-h-0 flex-1" emptyMessage="No entries match these filters." />
      )}

      {entries.length > 0 && (
        <Panel className="shrink-0" padded>
          <p className="text-[10px] text-fg-subtle">Journal statistics describe your recorded trades only. They are not a prediction of future performance.</p>
        </Panel>
      )}

      <JournalEntryDialog open={dialog.open} onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))} initial={dialog.initial} strategies={strategies} onSubmit={(input) => (dialog.initial ? update(dialog.initial.id, input) : create(input))} />
    </div>
  )
}
