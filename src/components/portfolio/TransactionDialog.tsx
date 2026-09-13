import { useState } from 'react'
import type { Transaction, TransactionInput, TransactionType } from '@shared/types'
import { useMarketStore } from '@/stores/marketStore'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { AssetSearch } from '@/components/market/AssetSearch'
import { AssetCell } from '@/components/market/AssetCell'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/cn'

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  portfolioId: number
  initial?: Transaction | null
  onSubmit: (input: TransactionInput) => Promise<boolean>
}

const TYPES: { value: TransactionType; label: string }[] = [
  { value: 'buy', label: 'Buy' },
  { value: 'sell', label: 'Sell' },
  { value: 'deposit', label: 'Deposit (transfer in)' },
  { value: 'withdrawal', label: 'Withdrawal (transfer out)' }
]

function toLocalInput(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** The form remounts every time the dialog opens, so its state is initialised from props. */
export function TransactionDialog(props: Props) {
  if (!props.open) return null
  return <TransactionForm key={props.initial?.id ?? 'new'} {...props} />
}

function TransactionForm({ open, onOpenChange, portfolioId, initial, onSubmit }: Props) {
  const byId = useMarketStore((s) => s.byId)
  const [assetId, setAssetId] = useState<string | null>(initial?.assetId ?? null)
  const [type, setType] = useState<TransactionType>(initial?.type ?? 'buy')
  const [quantity, setQuantity] = useState(initial ? String(initial.quantity) : '')
  const [price, setPrice] = useState(initial ? String(initial.price) : '')
  const [fee, setFee] = useState(initial ? String(initial.fee) : '0')
  const [when, setWhen] = useState(() => toLocalInput(initial?.timestamp ?? Date.now()))
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ticker = assetId ? byId[assetId] : undefined
  const q = Number(quantity)
  const p = Number(price)
  const f = Number(fee)
  const ts = Date.parse(when)
  const valid = !!assetId && Number.isFinite(q) && q > 0 && Number.isFinite(p) && p >= 0 && Number.isFinite(f) && f >= 0 && Number.isFinite(ts)
  const total = valid ? q * p + (type === 'buy' ? f : -f) : null

  const submit = async () => {
    if (!valid || !assetId) return
    setSaving(true)
    const ok = await onSubmit({ portfolioId, assetId, type, quantity: q, price: p, fee: f, timestamp: ts, notes: notes.trim() })
    setSaving(false)
    if (ok) onOpenChange(false)
    else setError('Could not save the transaction.')
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? 'Edit transaction' : 'Add transaction'}
      className="w-[520px]"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!valid || saving} onClick={() => void submit()}>
            {initial ? 'Save' : 'Add'}
          </Button>
        </>
      }
    >
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 text-xs text-fg-muted">
            <span>Type</span>
            <Select value={type} options={TYPES} onValueChange={setType} className="w-full" />
          </label>
          <label className="space-y-1 text-xs text-fg-muted">
            <span>Date & time</span>
            <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </label>
        </div>
        <div className="space-y-1 text-xs text-fg-muted">
          <span>Asset</span>
          {ticker ? (
            <div className="flex h-7 items-center justify-between rounded-md border border-border bg-surface-2 px-2.5">
              <AssetCell ticker={ticker} />
              <button type="button" className="text-[11px] text-accent hover:underline" onClick={() => setAssetId(null)}>
                change
              </button>
            </div>
          ) : (
            <AssetSearch autoFocus placeholder="Search asset…" onSelect={(t) => { setAssetId(t.assetId); if (!price) setPrice(String(t.price)) }} />
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <label className="space-y-1 text-xs text-fg-muted">
            <span>Quantity</span>
            <Input type="number" step="any" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="num" />
          </label>
          <label className="space-y-1 text-xs text-fg-muted">
            <span>Price (USD)</span>
            <Input type="number" step="any" min="0" value={price} onChange={(e) => setPrice(e.target.value)} className="num" placeholder={type === 'deposit' || type === 'withdrawal' ? '0 = unknown' : ''} />
          </label>
          <label className="space-y-1 text-xs text-fg-muted">
            <span>Fee (USD)</span>
            <Input type="number" step="any" min="0" value={fee} onChange={(e) => setFee(e.target.value)} className="num" />
          </label>
        </div>
        <label className="block space-y-1 text-xs text-fg-muted">
          <span>Notes</span>
          <Input value={notes} maxLength={2000} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </label>
        <div className={cn('flex items-center justify-between rounded-md bg-surface-2 px-2.5 py-1.5 text-xs', !valid && 'opacity-60')}>
          <span className="text-fg-muted">{type === 'buy' ? 'Total cost' : type === 'sell' ? 'Net proceeds' : 'Value'}</span>
          <span className="num font-semibold">{total != null ? formatCurrency(total) : '—'}</span>
        </div>
        {error && <div className="text-xs text-negative">{error}</div>}
      </form>
    </Dialog>
  )
}
