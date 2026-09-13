import { useEffect, useMemo, useState } from 'react'
import { FlaskConical, RotateCcw } from 'lucide-react'
import type { PaperPosition, PaperTrade } from '@shared/types'
import { accountEquity, computeStats, unrealizedPnl } from '@shared/analysis/paperTrading'
import { usePaperStore } from '@/stores/paperStore'
import { useMarketStore } from '@/stores/marketStore'
import { useUiStore } from '@/stores/uiStore'
import { OrderTicket } from '@/components/paper/OrderTicket'
import { VirtualTable, type Column } from '@/components/table/VirtualTable'
import { AssetCell } from '@/components/market/AssetCell'
import { PctChange } from '@/components/market/PctChange'
import { KpiTile } from '@/components/dashboard/widgets'
import { Panel } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Dialog } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { formatCurrency, formatDateTime, formatMoney, formatNumber, formatPercent } from '@/lib/format'
import { cn } from '@/lib/cn'

function Money({ value, signed = false }: { value: number | null | undefined; signed?: boolean }) {
  if (value == null || !Number.isFinite(value)) return <span className="num text-fg-subtle">—</span>
  const tone = signed ? (value > 0 ? 'text-positive' : value < 0 ? 'text-negative' : '') : ''
  return <span className={cn('num', tone)}>{signed && value > 0 ? '+' : ''}{signed ? formatMoney(value) : formatCurrency(value)}</span>
}

function SideBadge({ side }: { side: 'long' | 'short' }) {
  return <Badge tone={side === 'long' ? 'positive' : 'negative'} className="uppercase">{side}</Badge>
}

export function PaperTradingPage() {
  const { snapshot, load, open, close, reset, busy, error, clearError } = usePaperStore()
  const byId = useMarketStore((s) => s.byId)
  const navigate = useUiStore((s) => s.navigate)
  const [resetDialog, setResetDialog] = useState<{ balance: string; fee: string } | null>(null)
  const [tab, setTab] = useState<'positions' | 'history'>('positions')

  useEffect(() => void load(), [load])

  const account = snapshot?.account ?? null
  const positions = useMemo(() => snapshot?.positions ?? [], [snapshot])
  const trades = useMemo(() => snapshot?.trades ?? [], [snapshot])
  const equity = useMemo(() => (account ? accountEquity(account, positions, byId) : null), [account, positions, byId])
  const stats = useMemo(() => (account ? computeStats(trades, account.startingBalance) : null), [trades, account])
  const roi = account && equity ? ((equity.equity - account.startingBalance) / account.startingBalance) * 100 : null

  const positionColumns = useMemo<Column<PaperPosition>[]>(
    () => [
      { key: 'asset', header: 'Asset', width: 'minmax(130px, 1.3fr)', render: (p) => (byId[p.assetId] ? <AssetCell ticker={byId[p.assetId]!} /> : <span className="font-semibold">{p.symbol}</span>), sortValue: (p) => p.symbol },
      { key: 'side', header: 'Side', width: '70px', render: (p) => <SideBadge side={p.side} /> },
      { key: 'qty', header: 'Quantity', width: 'minmax(90px, 1fr)', align: 'right', render: (p) => <span className="num">{formatNumber(p.quantity, p.quantity >= 100 ? 2 : 6)}</span>, sortValue: (p) => p.quantity },
      { key: 'entry', header: 'Entry', width: 'minmax(96px, 1fr)', align: 'right', render: (p) => <Money value={p.entryPrice} />, sortValue: (p) => p.entryPrice },
      { key: 'mark', header: 'Mark', width: 'minmax(96px, 1fr)', align: 'right', render: (p) => <Money value={byId[p.assetId]?.price} />, sortValue: (p) => byId[p.assetId]?.price ?? null },
      { key: 'value', header: 'Notional', width: 'minmax(90px, 1fr)', align: 'right', render: (p) => <Money value={byId[p.assetId] ? p.quantity * byId[p.assetId]!.price : null} />, sortValue: (p) => (byId[p.assetId] ? p.quantity * byId[p.assetId]!.price : null) },
      { key: 'pnl', header: 'Unrealised P&L', width: 'minmax(110px, 1fr)', align: 'right', render: (p) => <Money value={byId[p.assetId] ? unrealizedPnl(p, byId[p.assetId]!.price) : null} signed />, sortValue: (p) => (byId[p.assetId] ? unrealizedPnl(p, byId[p.assetId]!.price) : null) },
      { key: 'pnlPct', header: 'P&L %', width: '80px', align: 'right', render: (p) => <PctChange value={byId[p.assetId] ? (unrealizedPnl(p, byId[p.assetId]!.price) / (p.quantity * p.entryPrice)) * 100 : null} /> },
      { key: 'opened', header: 'Opened', width: '132px', render: (p) => <span className="num text-fg-muted">{formatDateTime(p.openedAt)}</span>, sortValue: (p) => p.openedAt },
      {
        key: 'actions',
        header: '',
        width: '136px',
        align: 'right',
        render: (p) => (
          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <Button size="xs" variant="ghost" disabled={busy} onClick={() => void close({ positionId: p.id, quantity: p.quantity / 2 })}>
              Close 50%
            </Button>
            <Button size="xs" variant="outline" disabled={busy} onClick={() => void close({ positionId: p.id })}>
              Close
            </Button>
          </div>
        )
      }
    ],
    [byId, busy, close]
  )

  const tradeColumns = useMemo<Column<PaperTrade>[]>(
    () => [
      { key: 'closed', header: 'Closed', width: '140px', render: (t) => <span className="num text-fg-muted">{formatDateTime(t.closedAt)}</span>, sortValue: (t) => t.closedAt },
      { key: 'asset', header: 'Asset', width: 'minmax(140px, 1.5fr)', render: (t) => (byId[t.assetId] ? <AssetCell ticker={byId[t.assetId]!} /> : <span className="font-semibold">{t.symbol}</span>), sortValue: (t) => t.symbol },
      { key: 'side', header: 'Side', width: '70px', render: (t) => <SideBadge side={t.side} /> },
      { key: 'qty', header: 'Quantity', width: 'minmax(90px, 1fr)', align: 'right', render: (t) => <span className="num">{formatNumber(t.quantity, t.quantity >= 100 ? 2 : 6)}</span>, sortValue: (t) => t.quantity },
      { key: 'entry', header: 'Entry', width: 'minmax(96px, 1fr)', align: 'right', render: (t) => <Money value={t.entryPrice} />, sortValue: (t) => t.entryPrice },
      { key: 'exit', header: 'Exit', width: 'minmax(96px, 1fr)', align: 'right', render: (t) => <Money value={t.exitPrice} />, sortValue: (t) => t.exitPrice },
      { key: 'fees', header: 'Fees', width: '80px', align: 'right', render: (t) => <Money value={t.fees} />, sortValue: (t) => t.fees },
      { key: 'pnl', header: 'P&L', width: 'minmax(100px, 1fr)', align: 'right', render: (t) => <Money value={t.pnl} signed />, sortValue: (t) => t.pnl },
      { key: 'roi', header: 'ROI', width: '80px', align: 'right', render: (t) => <PctChange value={t.roiPct} />, sortValue: (t) => t.roiPct }
    ],
    [byId]
  )

  if (!account || !equity || !stats) return <div className="text-xs text-fg-muted">Loading simulation…</div>

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex shrink-0 items-center gap-2 rounded-md border border-warning/40 bg-warning-soft px-3 py-1.5 text-xs">
        <FlaskConical className="h-3.5 w-3.5 text-warning" />
        <span><span className="font-semibold text-warning">Simulation.</span> Orders fill at the app's latest market price with a simulated fee. No exchange is connected and no real money is involved.</span>
        <Button size="xs" variant="ghost" className="ml-auto" onClick={() => setResetDialog({ balance: String(account.startingBalance), fee: String(account.feeRate * 100) })}>
          <RotateCcw className="h-3.5 w-3.5" /> Reset account
        </Button>
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiTile label="Equity" value={formatCurrency(equity.equity)} sub={`Started with ${formatCurrency(account.startingBalance)}`} />
        <KpiTile label="Cash" value={formatCurrency(account.cash)} sub={`${positions.length} open position${positions.length === 1 ? '' : 's'}`} />
        <KpiTile label="Unrealised P&L" value={<Money value={equity.unrealized} signed />} tone={equity.unrealized > 0 ? 'positive' : equity.unrealized < 0 ? 'negative' : 'neutral'} sub={equity.unpriced.length ? `No price: ${equity.unpriced.join(', ')}` : 'Marked to live prices'} />
        <KpiTile label="Realised P&L" value={<Money value={stats.totalPnl} signed />} tone={stats.totalPnl > 0 ? 'positive' : stats.totalPnl < 0 ? 'negative' : 'neutral'} sub={`${stats.trades} closed trade${stats.trades === 1 ? '' : 's'}`} />
        <KpiTile label="ROI" value={formatPercent(roi)} tone={roi != null && roi > 0 ? 'positive' : roi != null && roi < 0 ? 'negative' : 'neutral'} sub="Equity vs starting balance" />
        <KpiTile label="Win rate" value={stats.winRatePct != null ? `${stats.winRatePct.toFixed(0)}%` : '—'} sub={stats.trades ? `${stats.wins}W / ${stats.losses}L · PF ${stats.profitFactor == null ? '—' : stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}` : 'No closed trades yet'} />
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-md border border-negative/40 bg-negative-soft px-3 py-2 text-xs text-negative">
          {error}
          <button type="button" className="underline" onClick={clearError}>dismiss</button>
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-12 gap-3">
        <div className="col-span-12 flex flex-col gap-3 xl:col-span-3">
          <OrderTicket cash={account.cash} feeRate={account.feeRate} busy={busy} onSubmit={(assetId, side, quantity) => open({ accountId: account.id, assetId, side, quantity })} />
          <Panel title="Statistics">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <dt className="text-fg-muted">Average win</dt><dd className="num text-right"><Money value={stats.averageWin} signed /></dd>
              <dt className="text-fg-muted">Average loss</dt><dd className="num text-right"><Money value={stats.averageLoss} signed /></dd>
              <dt className="text-fg-muted">Best trade</dt><dd className="num text-right"><Money value={stats.bestTrade} signed /></dd>
              <dt className="text-fg-muted">Worst trade</dt><dd className="num text-right"><Money value={stats.worstTrade} signed /></dd>
              <dt className="text-fg-muted">Max drawdown</dt><dd className="num text-right">{stats.maxDrawdownPct != null ? `${stats.maxDrawdownPct.toFixed(2)}%` : '—'}</dd>
              <dt className="text-fg-muted">Fees paid</dt><dd className="num text-right">{formatCurrency(stats.totalFees)}</dd>
            </dl>
          </Panel>
        </div>
        <div className="col-span-12 flex min-h-0 flex-col gap-2 xl:col-span-9">
          <div className="inline-flex w-fit rounded-md border border-border bg-surface-2 p-0.5">
            {(['positions', 'history'] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)} className={cn('h-6 rounded-sm px-2.5 text-[11px] font-medium capitalize', tab === t ? 'bg-accent-soft text-accent' : 'text-fg-muted hover:text-fg')}>
                {t === 'positions' ? `Open positions (${positions.length})` : `Trade history (${trades.length})`}
              </button>
            ))}
          </div>
          {tab === 'positions' ? (
            <VirtualTable columns={positionColumns} rows={positions} rowKey={(p) => String(p.id)} onRowClick={(p) => navigate({ page: 'asset', assetId: p.assetId })} className="min-h-0 flex-1" emptyMessage="No open simulated positions. Use the order ticket to open one." />
          ) : (
            <VirtualTable columns={tradeColumns} rows={trades} rowKey={(t) => String(t.id)} defaultSort={{ key: 'closed', dir: 'desc' }} className="min-h-0 flex-1" emptyMessage="No closed trades yet." />
          )}
        </div>
      </div>

      <Dialog
        open={resetDialog !== null}
        onOpenChange={(o) => !o && setResetDialog(null)}
        title="Reset simulation account"
        description="All simulated positions and trade history will be deleted and the balance restored."
        footer={
          <>
            <Button variant="ghost" onClick={() => setResetDialog(null)}>Cancel</Button>
            <Button
              variant="danger"
              disabled={!resetDialog || !(Number(resetDialog.balance) >= 100) || !(Number(resetDialog.fee) >= 0)}
              onClick={() => {
                if (!resetDialog) return
                void reset(Number(resetDialog.balance), Number(resetDialog.fee) / 100)
                setResetDialog(null)
              }}
            >
              Reset
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 text-xs text-fg-muted">
            <span>Starting balance (USD)</span>
            <Input type="number" min="100" step="any" value={resetDialog?.balance ?? ''} onChange={(e) => setResetDialog((d) => d && { ...d, balance: e.target.value })} className="num" />
          </label>
          <label className="space-y-1 text-xs text-fg-muted">
            <span>Fee per fill (%)</span>
            <Input type="number" min="0" max="5" step="0.01" value={resetDialog?.fee ?? ''} onChange={(e) => setResetDialog((d) => d && { ...d, fee: e.target.value })} className="num" />
          </label>
        </div>
      </Dialog>
    </div>
  )
}
