import { useState } from 'react'
import type { AlertDirection, AlertKind, AlertRule, AlertRuleInput } from '@shared/types'
import { ALERT_KIND_META, observedValue, formatValue } from '@shared/analysis/alerts'
import { useMarketStore } from '@/stores/marketStore'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { AssetSearch } from '@/components/market/AssetSearch'
import { AssetCell } from '@/components/market/AssetCell'
import { cn } from '@/lib/cn'

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  initial?: AlertRule | null
  prefillAssetId?: string | null
  onSubmit: (input: AlertRuleInput) => Promise<boolean>
}

const KIND_OPTIONS = (Object.keys(ALERT_KIND_META) as AlertKind[]).map((k) => ({ value: k, label: ALERT_KIND_META[k].label }))

export function AlertDialog(props: Props) {
  if (!props.open) return null
  return <AlertForm key={props.initial?.id ?? 'new'} {...props} />
}

function AlertForm({ open, onOpenChange, initial, prefillAssetId, onSubmit }: Props) {
  const byId = useMarketStore((s) => s.byId)
  const metrics = useAnalyticsStore((s) => s.metrics)
  const [assetId, setAssetId] = useState<string | null>(initial?.assetId ?? prefillAssetId ?? null)
  const [kind, setKind] = useState<AlertKind>(initial?.kind ?? 'price')
  const [direction, setDirection] = useState<AlertDirection>(initial?.direction ?? 'above')
  const [threshold, setThreshold] = useState(initial ? String(initial.threshold) : '')
  const [mode, setMode] = useState<'once' | 'repeating'>(initial?.mode ?? 'once')
  const [note, setNote] = useState(initial?.note ?? '')
  const [saving, setSaving] = useState(false)

  const ticker = assetId ? byId[assetId] : undefined
  const current = assetId ? observedValue(kind, ticker, metrics[assetId]) : null
  const th = Number(threshold)
  const valid = !!assetId && threshold.trim() !== '' && Number.isFinite(th)
  const meta = ALERT_KIND_META[kind]

  const submit = async () => {
    if (!valid || !assetId) return
    setSaving(true)
    const ok = await onSubmit({ assetId, kind, direction, threshold: th, mode, note: note.trim() })
    setSaving(false)
    if (ok) onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? 'Edit alert' : 'New alert'}
      description="You will get a desktop notification when the condition is crossed."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" disabled={!valid || saving} onClick={() => void submit()}>{initial ? 'Save' : 'Create alert'}</Button>
        </>
      }
    >
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit() }}>
        <div className="space-y-1 text-xs text-fg-muted">
          <span>Asset</span>
          {ticker ? (
            <div className="flex h-7 items-center justify-between rounded-md border border-border bg-surface-2 px-2.5">
              <AssetCell ticker={ticker} />
              <button type="button" className="text-[11px] text-accent hover:underline" onClick={() => setAssetId(null)}>change</button>
            </div>
          ) : (
            <AssetSearch autoFocus placeholder="Search asset…" onSelect={(t) => setAssetId(t.assetId)} />
          )}
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <label className="space-y-1 text-xs text-fg-muted">
            <span>Condition</span>
            <Select value={kind} options={KIND_OPTIONS} onValueChange={setKind} className="w-full" />
          </label>
          <div className="inline-flex rounded-md border border-border bg-surface-2 p-0.5">
            {(['above', 'below'] as const).map((d) => (
              <button key={d} type="button" onClick={() => setDirection(d)} className={cn('h-6 rounded-sm px-2.5 text-[11px] font-medium', direction === d ? 'bg-accent-soft text-accent' : 'text-fg-muted hover:text-fg')}>
                {d === 'above' ? '>' : '<'} {d}
              </button>
            ))}
          </div>
          <label className="space-y-1 text-xs text-fg-muted">
            <span>Threshold {meta.unit && `(${meta.unit})`}</span>
            <Input type="number" step="any" value={threshold} onChange={(e) => setThreshold(e.target.value)} className="num" />
          </label>
        </div>
        <div className="flex items-center justify-between rounded-md bg-surface-2 px-2.5 py-1.5 text-xs">
          <span className="text-fg-muted">{meta.description}</span>
          <span className="num">{current != null ? `now ${formatValue(kind, current)}` : 'no data yet'}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 text-xs text-fg-muted">
            <span>Repeat</span>
            <Select value={mode} options={[{ value: 'once', label: 'Once, then disable' }, { value: 'repeating', label: 'Every time it crosses' }]} onValueChange={setMode} className="w-full" />
          </label>
          <label className="space-y-1 text-xs text-fg-muted">
            <span>Note (shown in the notification)</span>
            <Input value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
          </label>
        </div>
      </form>
    </Dialog>
  )
}
