import { useState } from 'react'
import type { JournalEmotion, JournalEntry, JournalEntryInput, JournalSide } from '@shared/types'
import { JOURNAL_EMOTIONS } from '@shared/types'
import { journalPnl } from '@shared/analysis/journal'
import { useMarketStore } from '@/stores/marketStore'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { AssetSearch } from '@/components/market/AssetSearch'
import { AssetCell } from '@/components/market/AssetCell'
import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/cn'

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  initial?: JournalEntry | null
  /** Pre-fill for "journal this paper trade". */
  prefill?: Partial<JournalEntryInput> | null
  strategies: string[]
  onSubmit: (input: JournalEntryInput) => Promise<boolean>
}

function toLocalInput(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const EMOTION_OPTIONS = JOURNAL_EMOTIONS.map((e) => ({ value: e, label: e.charAt(0).toUpperCase() + e.slice(1) }))

export function JournalEntryDialog(props: Props) {
  if (!props.open) return null
  return <JournalForm key={props.initial?.id ?? 'new'} {...props} />
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn('block space-y-1 text-xs text-fg-muted', className)}>
      <span>{label}</span>
      {children}
    </label>
  )
}

function JournalForm({ open, onOpenChange, initial, prefill, strategies, onSubmit }: Props) {
  const byId = useMarketStore((s) => s.byId)
  const src = initial ?? prefill ?? null
  const [assetId, setAssetId] = useState<string | null>(src?.assetId ?? null)
  const [side, setSide] = useState<JournalSide>(src?.side ?? 'long')
  const [entryPrice, setEntryPrice] = useState(src?.entryPrice != null ? String(src.entryPrice) : '')
  const [exitPrice, setExitPrice] = useState(src?.exitPrice != null ? String(src.exitPrice) : '')
  const [quantity, setQuantity] = useState(src?.quantity != null ? String(src.quantity) : '')
  const [fees, setFees] = useState(src?.fees != null ? String(src.fees) : '0')
  const [strategy, setStrategy] = useState(src?.strategy ?? '')
  const [entryReason, setEntryReason] = useState(src?.entryReason ?? '')
  const [exitReason, setExitReason] = useState(src?.exitReason ?? '')
  const [emotion, setEmotion] = useState<JournalEmotion>(src?.emotion ?? 'neutral')
  const [notes, setNotes] = useState(src?.notes ?? '')
  const [screenshotPath, setScreenshotPath] = useState(src?.screenshotPath ?? '')
  const [tags, setTags] = useState((src?.tags ?? []).join(', '))
  const [openedAt, setOpenedAt] = useState(() => toLocalInput(src?.openedAt ?? Date.now()))
  const [closedAt, setClosedAt] = useState(() => (src?.closedAt ? toLocalInput(src.closedAt) : ''))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ticker = assetId ? byId[assetId] : undefined
  const ep = Number(entryPrice)
  const xp = exitPrice.trim() === '' ? null : Number(exitPrice)
  const q = Number(quantity)
  const f = Number(fees)
  const o = Date.parse(openedAt)
  const c = closedAt.trim() === '' ? null : Date.parse(closedAt)
  const valid = !!assetId && Number.isFinite(ep) && ep >= 0 && (xp == null || (Number.isFinite(xp) && xp >= 0)) && Number.isFinite(q) && q > 0 && Number.isFinite(f) && f >= 0 && Number.isFinite(o) && (c == null || Number.isFinite(c))
  const pnl = valid ? journalPnl({ side, entryPrice: ep, exitPrice: xp, quantity: q, fees: f }) : null

  const submit = async () => {
    if (!valid || !assetId) return
    setSaving(true)
    const ok = await onSubmit({
      assetId,
      side,
      entryPrice: ep,
      exitPrice: xp,
      quantity: q,
      fees: f,
      strategy: strategy.trim(),
      entryReason: entryReason.trim(),
      exitReason: exitReason.trim(),
      emotion,
      notes: notes.trim(),
      screenshotPath: screenshotPath.trim(),
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 20),
      openedAt: o,
      closedAt: xp != null ? (c ?? Date.now()) : null
    })
    setSaving(false)
    if (ok) onOpenChange(false)
    else setError('Could not save the entry.')
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? 'Edit journal entry' : 'New journal entry'}
      className="w-[640px]"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" disabled={!valid || saving} onClick={() => void submit()}>{initial ? 'Save' : 'Add entry'}</Button>
        </>
      }
    >
      <form className="max-h-[70vh] space-y-3 overflow-y-auto pr-1" onSubmit={(e) => { e.preventDefault(); void submit() }}>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Asset" className="col-span-2">
            {ticker ? (
              <div className="flex h-7 items-center justify-between rounded-md border border-border bg-surface-2 px-2.5">
                <AssetCell ticker={ticker} />
                <button type="button" className="text-[11px] text-accent hover:underline" onClick={() => setAssetId(null)}>change</button>
              </div>
            ) : (
              <AssetSearch autoFocus placeholder="Search asset…" onSelect={(t) => setAssetId(t.assetId)} />
            )}
          </Field>
          <Field label="Side">
            <div className="grid grid-cols-2 gap-1 rounded-md border border-border bg-surface-2 p-0.5">
              {(['long', 'short'] as const).map((s) => (
                <button key={s} type="button" onClick={() => setSide(s)} className={cn('h-6 rounded-sm text-[11px] font-semibold uppercase', side === s ? (s === 'long' ? 'bg-positive-soft text-positive' : 'bg-negative-soft text-negative') : 'text-fg-muted hover:text-fg')}>
                  {s}
                </button>
              ))}
            </div>
          </Field>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <Field label="Entry price"><Input type="number" step="any" min="0" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} className="num" /></Field>
          <Field label="Exit price"><Input type="number" step="any" min="0" value={exitPrice} onChange={(e) => setExitPrice(e.target.value)} className="num" placeholder="open" /></Field>
          <Field label="Position size"><Input type="number" step="any" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="num" /></Field>
          <Field label="Fees (USD)"><Input type="number" step="any" min="0" value={fees} onChange={(e) => setFees(e.target.value)} className="num" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Opened"><Input type="datetime-local" value={openedAt} onChange={(e) => setOpenedAt(e.target.value)} /></Field>
          <Field label="Closed"><Input type="datetime-local" value={closedAt} onChange={(e) => setClosedAt(e.target.value)} disabled={xp == null} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Strategy">
            <Input list="journal-strategies" value={strategy} maxLength={80} onChange={(e) => setStrategy(e.target.value)} placeholder="e.g. Breakout, Mean reversion" />
            <datalist id="journal-strategies">{strategies.map((s) => <option key={s} value={s} />)}</datalist>
          </Field>
          <Field label="Emotion at entry"><Select value={emotion} options={EMOTION_OPTIONS} onValueChange={setEmotion} className="w-full" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Reason for entry"><textarea value={entryReason} maxLength={4000} onChange={(e) => setEntryReason(e.target.value)} rows={3} className="w-full rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></Field>
          <Field label="Reason for exit"><textarea value={exitReason} maxLength={4000} onChange={(e) => setExitReason(e.target.value)} rows={3} className="w-full rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></Field>
        </div>
        <Field label="Notes"><textarea value={notes} maxLength={10000} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tags (comma separated)"><Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="swing, news, btc-dominance" /></Field>
          <Field label="Screenshot path (optional)"><Input value={screenshotPath} maxLength={1024} onChange={(e) => setScreenshotPath(e.target.value)} placeholder="C:\\…\\chart.png" /></Field>
        </div>
        <div className={cn('flex items-center justify-between rounded-md bg-surface-2 px-2.5 py-1.5 text-xs', !valid && 'opacity-60')}>
          <span className="text-fg-muted">{xp == null ? 'Trade is open — P&L will be computed when an exit price is set' : 'Net P&L'}</span>
          <span className={cn('num font-semibold', pnl != null && pnl > 0 && 'text-positive', pnl != null && pnl < 0 && 'text-negative')}>{pnl != null ? `${pnl > 0 ? '+' : ''}${formatMoney(pnl)}` : '—'}</span>
        </div>
        {error && <div className="text-xs text-negative">{error}</div>}
      </form>
    </Dialog>
  )
}
