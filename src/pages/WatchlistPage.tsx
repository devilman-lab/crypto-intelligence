import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Pencil, Plus, Star, Trash2, X } from 'lucide-react'
import type { Ticker, WatchlistItem } from '@shared/types'
import { useWatchlistStore } from '@/stores/watchlistStore'
import { useMarketStore } from '@/stores/marketStore'
import { useUiStore } from '@/stores/uiStore'
import { VirtualTable, type Column } from '@/components/table/VirtualTable'
import { AssetCell } from '@/components/market/AssetCell'
import { AssetSearch } from '@/components/market/AssetSearch'
import { PctChange } from '@/components/market/PctChange'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCompactCurrency, formatCurrency } from '@/lib/format'
import { cn } from '@/lib/cn'

type Row = WatchlistItem & { ticker: Ticker | undefined }

export function WatchlistPage() {
  const { lists, activeId, setActive, create, rename, remove, addItem, removeItem, reorder, error } = useWatchlistStore()
  const byId = useMarketStore((s) => s.byId)
  const navigate = useUiStore((s) => s.navigate)
  const [dialog, setDialog] = useState<{ mode: 'create' | 'rename'; name: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const active = lists.find((l) => l.id === activeId) ?? null
  const rows = useMemo<Row[]>(() => (active ? active.items.map((i) => ({ ...i, ticker: byId[i.assetId] })) : []), [active, byId])
  const excluded = useMemo(() => new Set(active?.items.map((i) => i.assetId)), [active])

  const submitDialog = () => {
    if (!dialog?.name.trim()) return
    if (dialog.mode === 'create') void create(dialog.name.trim())
    else if (active) void rename(active.id, dialog.name.trim())
    setDialog(null)
  }

  const columns = useMemo<Column<Row>[]>(() => {
    const move = (assetId: string, dir: -1 | 1) => {
      if (!active) return
      const ids = active.items.map((i) => i.assetId)
      const idx = ids.indexOf(assetId)
      const to = idx + dir
      if (idx < 0 || to < 0 || to >= ids.length) return
      ;[ids[idx], ids[to]] = [ids[to]!, ids[idx]!]
      void reorder(active.id, ids)
    }
    return [
      { key: 'asset', header: 'Asset', width: 'minmax(180px, 2fr)', render: (r) => (r.ticker ? <AssetCell ticker={r.ticker} /> : <span className="font-semibold">{r.symbol}</span>) },
      { key: 'price', header: 'Price', width: 'minmax(100px, 1fr)', align: 'right', render: (r) => <span className="num">{formatCurrency(r.ticker?.price)}</span>, sortValue: (r) => r.ticker?.price ?? null },
      { key: 'c24h', header: '24h', width: '84px', align: 'right', render: (r) => <PctChange value={r.ticker?.change24hPct} />, sortValue: (r) => r.ticker?.change24hPct ?? null },
      { key: 'c7d', header: '7d', width: '84px', align: 'right', render: (r) => <PctChange value={r.ticker?.change7dPct} />, sortValue: (r) => r.ticker?.change7dPct ?? null },
      { key: 'mcap', header: 'Market cap', width: 'minmax(100px, 1fr)', align: 'right', render: (r) => <span className="num">{formatCompactCurrency(r.ticker?.marketCap)}</span>, sortValue: (r) => r.ticker?.marketCap ?? null },
      { key: 'vol', header: 'Volume 24h', width: 'minmax(100px, 1fr)', align: 'right', render: (r) => <span className="num">{formatCompactCurrency(r.ticker?.volume24h)}</span>, sortValue: (r) => r.ticker?.volume24h ?? null },
      {
        key: 'actions',
        header: '',
        width: '96px',
        align: 'right',
        render: (r) => (
          <div className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
            <Button size="icon" variant="ghost" aria-label="Move up" onClick={() => move(r.assetId, -1)}>
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" aria-label="Move down" onClick={() => move(r.assetId, 1)}>
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" aria-label="Remove" onClick={() => active && void removeItem(active.id, r.assetId)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )
      }
    ]
  }, [active, reorder, removeItem])

  return (
    <div className="flex h-full gap-3">
      <aside className="flex w-56 shrink-0 flex-col rounded-lg border border-border bg-surface">
        <div className="flex h-9 items-center justify-between border-b border-border px-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Watchlists</span>
          <Button size="icon" variant="ghost" aria-label="New watchlist" onClick={() => setDialog({ mode: 'create', name: '' })}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <ul className="flex-1 overflow-auto py-1">
          {lists.map((l) => (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => setActive(l.id)}
                className={cn(
                  'flex w-full items-center justify-between px-3 py-1.5 text-left text-[13px]',
                  l.id === activeId ? 'bg-accent-soft text-fg' : 'text-fg-muted hover:bg-surface-2 hover:text-fg'
                )}
              >
                <span className="truncate">{l.name}</span>
                <span className="num text-[11px] text-fg-subtle">{l.items.length}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {active ? (
          <>
            <div className="flex shrink-0 items-center gap-2">
              <h2 className="text-sm font-semibold">{active.name}</h2>
              <Button size="icon" variant="ghost" aria-label="Rename" onClick={() => setDialog({ mode: 'rename', name: active.name })}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" aria-label="Delete watchlist" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <AssetSearch className="ml-auto w-72" exclude={excluded} onSelect={(t) => void addItem(active.id, t.assetId)} />
            </div>
            {error && <div className="rounded-md border border-negative/40 bg-negative-soft px-3 py-2 text-xs text-negative">{error}</div>}
            {rows.length === 0 ? (
              <EmptyState icon={Star} title="This watchlist is empty" description="Use the search box to add assets, or click the star in the Markets table." />
            ) : (
              <VirtualTable columns={columns} rows={rows} rowKey={(r) => r.assetId} onRowClick={(r) => navigate({ page: 'asset', assetId: r.assetId })} className="min-h-0 flex-1" />
            )}
          </>
        ) : (
          <EmptyState icon={Star} title="No watchlist selected" action={<Button onClick={() => setDialog({ mode: 'create', name: '' })}>Create watchlist</Button>} />
        )}
      </div>

      <Dialog
        open={dialog !== null}
        onOpenChange={(o) => !o && setDialog(null)}
        title={dialog?.mode === 'create' ? 'New watchlist' : 'Rename watchlist'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button variant="primary" disabled={!dialog?.name.trim()} onClick={submitDialog}>
              {dialog?.mode === 'create' ? 'Create' : 'Save'}
            </Button>
          </>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submitDialog()
          }}
        >
          <Input
            autoFocus
            value={dialog?.name ?? ''}
            maxLength={60}
            placeholder="e.g. Trading, Long Term, High Volatility"
            onChange={(e) => setDialog((d) => d && { ...d, name: e.target.value })}
          />
        </form>
      </Dialog>

      <Dialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete watchlist?"
        description={`"${active?.name}" and its ${active?.items.length ?? 0} items will be removed. This cannot be undone.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (active) void remove(active.id)
                setConfirmDelete(false)
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <span className="sr-only">Confirm deletion</span>
      </Dialog>
    </div>
  )
}
