import { useState } from 'react'
import type { PaperSide, Ticker } from '@shared/types'
import { openCost } from '@shared/analysis/paperTrading'
import { AssetSearch } from '@/components/market/AssetSearch'
import { AssetCell } from '@/components/market/AssetCell'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Panel } from '@/components/ui/Panel'
import { formatCurrency, formatNumber } from '@/lib/format'
import { cn } from '@/lib/cn'

interface Props {
  cash: number
  feeRate: number
  busy: boolean
  onSubmit: (assetId: string, side: PaperSide, quantity: number) => Promise<boolean>
}

/** Simulated order entry. Size can be typed in units or USD; the fill uses the live price held by the main process. */
export function OrderTicket({ cash, feeRate, busy, onSubmit }: Props) {
  const [ticker, setTicker] = useState<Ticker | null>(null)
  const [side, setSide] = useState<PaperSide>('long')
  const [mode, setMode] = useState<'usd' | 'units'>('usd')
  const [amount, setAmount] = useState('')

  const price = ticker?.price ?? null
  const n = Number(amount)
  const quantity = price && Number.isFinite(n) && n > 0 ? (mode === 'usd' ? n / price : n) : 0
  const cost = price ? openCost(quantity, price, feeRate) : null
  const canAfford = !!cost && cost.total <= cash + 1e-9
  const valid = quantity > 0 && canAfford

  const submit = async () => {
    if (!ticker || !valid) return
    const ok = await onSubmit(ticker.assetId, side, quantity)
    if (ok) setAmount('')
  }

  return (
    <Panel title="New simulated order">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        {ticker ? (
          <div className="flex h-7 items-center justify-between rounded-md border border-border bg-surface-2 px-2.5">
            <AssetCell ticker={ticker} />
            <span className="num text-xs">{formatCurrency(ticker.price)}</span>
            <button type="button" className="text-[11px] text-accent hover:underline" onClick={() => setTicker(null)}>
              change
            </button>
          </div>
        ) : (
          <AssetSearch placeholder="Select asset…" onSelect={setTicker} />
        )}

        <div className="grid grid-cols-2 gap-1 rounded-md border border-border bg-surface-2 p-0.5">
          <button type="button" onClick={() => setSide('long')} className={cn('h-7 rounded-sm text-xs font-semibold', side === 'long' ? 'bg-positive-soft text-positive' : 'text-fg-muted hover:text-fg')}>
            Long / Buy
          </button>
          <button type="button" onClick={() => setSide('short')} className={cn('h-7 rounded-sm text-xs font-semibold', side === 'short' ? 'bg-negative-soft text-negative' : 'text-fg-muted hover:text-fg')}>
            Short / Sell
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Input type="number" step="any" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={mode === 'usd' ? 'Amount in USD' : 'Quantity in units'} className="num" />
          <div className="inline-flex shrink-0 rounded-md border border-border bg-surface-2 p-0.5">
            {(['usd', 'units'] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)} className={cn('h-6 rounded-sm px-2 text-[11px] font-medium uppercase', mode === m ? 'bg-accent-soft text-accent' : 'text-fg-muted hover:text-fg')}>
                {m}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-1">
          {[25, 50, 100].map((pct) => (
            <Button key={pct} size="xs" variant="ghost" type="button" disabled={!price} onClick={() => { const usd = (cash * pct) / 100 / (1 + feeRate); setMode('usd'); setAmount(usd.toFixed(2)) }}>
              {pct}%
            </Button>
          ))}
        </div>

        <div className="space-y-1 rounded-md bg-surface-2 px-2.5 py-2 text-xs">
          <div className="flex justify-between"><span className="text-fg-muted">Quantity</span><span className="num">{quantity ? formatNumber(quantity, quantity >= 100 ? 2 : 6) : '—'}</span></div>
          <div className="flex justify-between"><span className="text-fg-muted">Notional</span><span className="num">{cost ? formatCurrency(cost.notional) : '—'}</span></div>
          <div className="flex justify-between"><span className="text-fg-muted">Fee ({(feeRate * 100).toFixed(2)}%)</span><span className="num">{cost ? formatCurrency(cost.fee) : '—'}</span></div>
          <div className="flex justify-between border-t border-border pt-1 font-semibold"><span>{side === 'short' ? 'Collateral + fee' : 'Total cost'}</span><span className={cn('num', cost && !canAfford && 'text-negative')}>{cost ? formatCurrency(cost.total) : '—'}</span></div>
        </div>

        <Button type="submit" variant={side === 'long' ? 'positive' : 'danger'} size="md" className="w-full" disabled={!valid || busy || !ticker}>
          {side === 'long' ? 'Open long' : 'Open short'} (simulated)
        </Button>
        {cost && !canAfford && <div className="text-[11px] text-negative">Insufficient simulated cash ({formatCurrency(cash)} available).</div>}
      </form>
    </Panel>
  )
}
