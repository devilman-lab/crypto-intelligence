import { useMemo, useState } from 'react'
import { Briefcase, Pencil, Plus, Trash2 } from 'lucide-react'
import type { Transaction, ValuedHolding } from '@shared/types'
import { usePortfolioStore } from '@/stores/portfolioStore'
import { useMarketStore } from '@/stores/marketStore'
import { useUiStore } from '@/stores/uiStore'
import { usePortfolioValuation } from '@/hooks/usePortfolioValuation'
import { VirtualTable, type Column } from '@/components/table/VirtualTable'
import { AssetCell } from '@/components/market/AssetCell'
import { PctChange } from '@/components/market/PctChange'
import { AllocationDonut } from '@/components/portfolio/AllocationDonut'
import { TransactionDialog } from '@/components/portfolio/TransactionDialog'
import { KpiTile } from '@/components/dashboard/widgets'
import { Panel } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency, formatDateTime, formatNumber, formatPercent } from '@/lib/format'
import { cn } from '@/lib/cn'

function Money({ value, signed = false }: { value: number | null | undefined; signed?: boolean }) {
  if (value == null) return <span className="num text-fg-subtle">—</span>
  const tone = signed ? (value > 0 ? 'text-positive' : value < 0 ? 'text-negative' : '') : ''
  return <span className={cn('num', tone)}>{signed && value > 0 ? '+' : ''}{formatCurrency(value)}</span>
}

export function PortfolioPage() {
  const { portfolios, activeId, setActive, create, rename, remove, transactions, addTransaction, updateTransaction, deleteTransaction, error } = usePortfolioStore()
  const byId = useMarketStore((s) => s.byId)
  const navigate = useUiStore((s) => s.navigate)
  const valuation = usePortfolioValuation(activeId)
  const [txDialog, setTxDialog] = useState<{ open: boolean; initial: Transaction | null }>({ open: false, initial: null })
  const [nameDialog, setNameDialog] = useState<{ mode: 'create' | 'rename'; name: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [tab, setTab] = useState<'holdings' | 'transactions'>('holdings')

  const active = portfolios.find((p) => p.id === activeId) ?? null
  const txs = useMemo(() => (activeId ? (transactions[activeId] ?? []) : []), [transactions, activeId])
  const { summary, open } = valuation

  const holdingColumns = useMemo<Column<ValuedHolding>[]>(
    () => [
      { key: 'asset', header: 'Asset', width: 'minmax(160px, 2fr)', render: (h) => (byId[h.assetId] ? <AssetCell ticker={byId[h.assetId]!} /> : <span className="font-semibold">{h.symbol}</span>), sortValue: (h) => h.symbol },
      { key: 'qty', header: 'Quantity', width: 'minmax(90px, 1fr)', align: 'right', render: (h) => <span className="num">{formatNumber(h.quantity, h.quantity >= 100 ? 2 : h.quantity >= 1 ? 4 : 6)}</span>, sortValue: (h) => h.quantity },
      { key: 'avg', header: 'Avg cost', width: 'minmax(100px, 1fr)', align: 'right', render: (h) => <Money value={h.averageCost} />, sortValue: (h) => h.averageCost },
      { key: 'price', header: 'Price', width: 'minmax(100px, 1fr)', align: 'right', render: (h) => <Money value={h.price} />, sortValue: (h) => h.price },
      { key: 'value', header: 'Value', width: 'minmax(110px, 1fr)', align: 'right', render: (h) => <Money value={h.value} />, sortValue: (h) => h.value },
      { key: 'cost', header: 'Cost basis', width: 'minmax(96px, 1fr)', align: 'right', render: (h) => <Money value={h.costBasis} />, sortValue: (h) => h.costBasis },
      { key: 'upnl', header: 'Unrealised P&L', width: 'minmax(120px, 1fr)', align: 'right', render: (h) => <Money value={h.unrealizedPnl} signed />, sortValue: (h) => h.unrealizedPnl },
      { key: 'upnlPct', header: 'P&L %', width: '84px', align: 'right', render: (h) => <PctChange value={h.unrealizedPnlPct} />, sortValue: (h) => h.unrealizedPnlPct },
      { key: 'daily', header: '24h P&L', width: 'minmax(100px, 1fr)', align: 'right', render: (h) => <Money value={h.dailyPnl} signed />, sortValue: (h) => h.dailyPnl },
      { key: 'alloc', header: 'Allocation', width: '90px', align: 'right', render: (h) => <span className="num">{h.allocationPct != null ? `${h.allocationPct.toFixed(1)}%` : '—'}</span>, sortValue: (h) => h.allocationPct }
    ],
    [byId]
  )

  const txColumns = useMemo<Column<Transaction>[]>(
    () => [
      { key: 'date', header: 'Date', width: '150px', render: (t) => <span className="num text-fg-muted">{formatDateTime(t.timestamp)}</span>, sortValue: (t) => t.timestamp },
      { key: 'type', header: 'Type', width: '96px', render: (t) => <Badge tone={t.type === 'buy' || t.type === 'deposit' ? 'positive' : 'negative'} className="capitalize">{t.type}</Badge>, sortValue: (t) => t.type },
      { key: 'asset', header: 'Asset', width: 'minmax(140px, 1.5fr)', render: (t) => (byId[t.assetId] ? <AssetCell ticker={byId[t.assetId]!} /> : <span className="font-semibold">{t.symbol}</span>), sortValue: (t) => t.symbol },
      { key: 'qty', header: 'Quantity', width: 'minmax(90px, 1fr)', align: 'right', render: (t) => <span className="num">{formatNumber(t.quantity, t.quantity >= 100 ? 2 : 6)}</span>, sortValue: (t) => t.quantity },
      { key: 'price', header: 'Price', width: 'minmax(100px, 1fr)', align: 'right', render: (t) => <Money value={t.price} />, sortValue: (t) => t.price },
      { key: 'fee', header: 'Fee', width: '80px', align: 'right', render: (t) => <Money value={t.fee} />, sortValue: (t) => t.fee },
      { key: 'total', header: 'Total', width: 'minmax(100px, 1fr)', align: 'right', render: (t) => <Money value={t.quantity * t.price} />, sortValue: (t) => t.quantity * t.price },
      { key: 'notes', header: 'Notes', width: 'minmax(80px, 1.5fr)', render: (t) => <span className="text-fg-muted">{t.notes}</span> },
      {
        key: 'actions',
        header: '',
        width: '72px',
        align: 'right',
        render: (t) => (
          <div className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
            <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setTxDialog({ open: true, initial: t })}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => void deleteTransaction(t.portfolioId, t.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )
      }
    ],
    [byId, deleteTransaction]
  )

  const submitName = () => {
    if (!nameDialog?.name.trim()) return
    if (nameDialog.mode === 'create') void create(nameDialog.name.trim())
    else if (active) void rename(active.id, nameDialog.name.trim())
    setNameDialog(null)
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md border border-border bg-surface-2 p-0.5">
          {portfolios.map((p) => (
            <button key={p.id} type="button" onClick={() => setActive(p.id)} className={cn('h-6 rounded-sm px-2.5 text-[11px] font-medium', p.id === activeId ? 'bg-accent-soft text-accent' : 'text-fg-muted hover:text-fg')}>
              {p.name}
            </button>
          ))}
          <button type="button" onClick={() => setNameDialog({ mode: 'create', name: '' })} className="h-6 rounded-sm px-2 text-fg-muted hover:text-fg" aria-label="New portfolio">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        {active && (
          <>
            <Button size="icon" variant="ghost" aria-label="Rename portfolio" onClick={() => setNameDialog({ mode: 'rename', name: active.name })}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" aria-label="Delete portfolio" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
        {summary.unpriced.length > 0 && <Badge tone="warning">No live price: {summary.unpriced.join(', ')}</Badge>}
        <Button variant="primary" size="sm" className="ml-auto" disabled={!active} onClick={() => setTxDialog({ open: true, initial: null })}>
          <Plus className="h-3.5 w-3.5" /> Add transaction
        </Button>
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiTile label="Total value" value={formatCurrency(summary.totalValue)} sub={`Cost basis ${formatCurrency(summary.totalCost)}`} />
        <KpiTile label="Unrealised P&L" value={<Money value={summary.unrealizedPnl} signed />} sub={formatPercent(summary.unrealizedPnlPct)} tone={summary.unrealizedPnl > 0 ? 'positive' : summary.unrealizedPnl < 0 ? 'negative' : 'neutral'} />
        <KpiTile label="24h P&L" value={<Money value={summary.dailyPnl} signed />} sub={formatPercent(summary.dailyPnlPct)} tone={summary.dailyPnl > 0 ? 'positive' : summary.dailyPnl < 0 ? 'negative' : 'neutral'} />
        <KpiTile label="Realised P&L" value={<Money value={summary.realizedPnl} signed />} sub="From sells, net of fees" />
        <KpiTile label="Total P&L" value={<Money value={summary.unrealizedPnl + summary.realizedPnl} signed />} sub="Unrealised + realised" />
        <KpiTile label="Fees paid" value={formatCurrency(summary.fees)} sub={`${txs.length} transactions`} />
      </div>

      {error && <div className="rounded-md border border-negative/40 bg-negative-soft px-3 py-2 text-xs text-negative">{error}</div>}

      {txs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No transactions yet"
          description="Record your buys, sells, deposits and withdrawals to see holdings, cost basis and P&L. Everything stays on this computer."
          action={
            <Button variant="primary" onClick={() => setTxDialog({ open: true, initial: null })} disabled={!active}>
              <Plus className="h-3.5 w-3.5" /> Add your first transaction
            </Button>
          }
        />
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-12 gap-3">
          <div className="col-span-12 flex min-h-0 flex-col gap-2 xl:col-span-9">
            <div className="inline-flex w-fit rounded-md border border-border bg-surface-2 p-0.5">
              {(['holdings', 'transactions'] as const).map((t) => (
                <button key={t} type="button" onClick={() => setTab(t)} className={cn('h-6 rounded-sm px-2.5 text-[11px] font-medium capitalize', tab === t ? 'bg-accent-soft text-accent' : 'text-fg-muted hover:text-fg')}>
                  {t}
                </button>
              ))}
            </div>
            {tab === 'holdings' ? (
              <VirtualTable columns={holdingColumns} rows={open} rowKey={(h) => h.assetId} defaultSort={{ key: 'value', dir: 'desc' }} onRowClick={(h) => navigate({ page: 'asset', assetId: h.assetId })} className="min-h-0 flex-1" emptyMessage="All positions are closed." />
            ) : (
              <VirtualTable columns={txColumns} rows={txs} rowKey={(t) => String(t.id)} defaultSort={{ key: 'date', dir: 'desc' }} className="min-h-0 flex-1" />
            )}
          </div>
          <Panel title="Allocation" className="col-span-12 xl:col-span-3">
            <AllocationDonut slices={open.filter((h) => h.value != null).map((h) => ({ key: h.assetId, label: h.symbol, value: h.value! }))} />
          </Panel>
        </div>
      )}

      {active && (
        <TransactionDialog
          open={txDialog.open}
          onOpenChange={(o) => setTxDialog((d) => ({ ...d, open: o }))}
          portfolioId={active.id}
          initial={txDialog.initial}
          onSubmit={(input) => (txDialog.initial ? updateTransaction(txDialog.initial.id, input) : addTransaction(input))}
        />
      )}

      <Dialog
        open={nameDialog !== null}
        onOpenChange={(o) => !o && setNameDialog(null)}
        title={nameDialog?.mode === 'create' ? 'New portfolio' : 'Rename portfolio'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setNameDialog(null)}>Cancel</Button>
            <Button variant="primary" disabled={!nameDialog?.name.trim()} onClick={submitName}>{nameDialog?.mode === 'create' ? 'Create' : 'Save'}</Button>
          </>
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); submitName() }}>
          <Input autoFocus value={nameDialog?.name ?? ''} maxLength={60} placeholder="e.g. Long-term, Trading, Experimental" onChange={(e) => setNameDialog((d) => d && { ...d, name: e.target.value })} />
        </form>
      </Dialog>

      <Dialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete portfolio?"
        description={`"${active?.name}" and its ${txs.length} transactions will be permanently removed.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => { if (active) void remove(active.id); setConfirmDelete(false) }}>Delete</Button>
          </>
        }
      >
        <span className="sr-only">Confirm deletion</span>
      </Dialog>
    </div>
  )
}
