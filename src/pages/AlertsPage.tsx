import { useEffect, useMemo, useState } from 'react'
import { Bell, BellOff, Pencil, Plus, Trash2 } from 'lucide-react'
import type { AlertRule, AlertTrigger } from '@shared/types'
import { describeRule, formatValue, observedValue } from '@shared/analysis/alerts'
import { useAlertStore } from '@/stores/alertStore'
import { useMarketStore } from '@/stores/marketStore'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUiStore } from '@/stores/uiStore'
import { AlertDialog } from '@/components/alerts/AlertDialog'
import { VirtualTable, type Column } from '@/components/table/VirtualTable'
import { AssetCell } from '@/components/market/AssetCell'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Switch } from '@/components/ui/Switch'
import { Panel } from '@/components/ui/Panel'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDateTime, formatRelativeTime } from '@/lib/format'

export function AlertsPage() {
  const { rules, triggers, load, create, update, setEnabled, remove, clearTriggers, error } = useAlertStore()
  const byId = useMarketStore((s) => s.byId)
  const metrics = useAnalyticsStore((s) => s.metrics)
  const notificationsEnabled = useSettingsStore((s) => s.settings.notificationsEnabled)
  const navigate = useUiStore((s) => s.navigate)
  const [dialog, setDialog] = useState<{ open: boolean; initial: AlertRule | null }>({ open: false, initial: null })

  useEffect(() => void load(), [load])

  const columns = useMemo<Column<AlertRule>[]>(
    () => [
      { key: 'on', header: '', width: '52px', align: 'center', render: (r) => <span onClick={(e) => e.stopPropagation()}><Switch checked={r.enabled} onCheckedChange={(v) => void setEnabled(r.id, v)} /></span> },
      { key: 'asset', header: 'Asset', width: 'minmax(120px, 1fr)', render: (r) => (byId[r.assetId] ? <AssetCell ticker={byId[r.assetId]!} showName={false} /> : <span className="font-semibold">{r.symbol}</span>), sortValue: (r) => r.symbol },
      { key: 'rule', header: 'Condition', width: 'minmax(220px, 2fr)', render: (r) => <span className={r.enabled ? '' : 'text-fg-muted'}>{describeRule(r)}</span> },
      { key: 'now', header: 'Current', width: 'minmax(100px, 1fr)', align: 'right', render: (r) => { const v = observedValue(r.kind, byId[r.assetId], metrics[r.assetId]); return <span className="num text-fg-muted">{v != null ? formatValue(r.kind, v) : '—'}</span> } },
      { key: 'mode', header: 'Repeat', width: '90px', render: (r) => <Badge tone={r.mode === 'repeating' ? 'accent' : 'neutral'}>{r.mode === 'repeating' ? 'Repeating' : 'Once'}</Badge>, sortValue: (r) => r.mode },
      { key: 'status', header: 'Status', width: '110px', render: (r) => (!r.enabled ? <Badge tone="neutral">{r.triggerCount ? 'Fired · off' : 'Off'}</Badge> : r.armed ? <Badge tone="warning">Condition met</Badge> : <Badge tone="positive">Watching</Badge>) },
      { key: 'last', header: 'Last fired', width: '130px', render: (r) => <span className="num text-fg-muted">{r.lastTriggeredAt ? formatRelativeTime(r.lastTriggeredAt) : '—'}</span>, sortValue: (r) => r.lastTriggeredAt },
      { key: 'count', header: '#', width: '48px', align: 'right', render: (r) => <span className="num text-fg-muted">{r.triggerCount}</span>, sortValue: (r) => r.triggerCount },
      { key: 'note', header: 'Note', width: 'minmax(80px, 1.2fr)', render: (r) => <span className="truncate text-fg-muted">{r.note}</span> },
      {
        key: 'actions',
        header: '',
        width: '72px',
        align: 'right',
        render: (r) => (
          <div className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
            <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setDialog({ open: true, initial: r })}><Pencil className="h-3.5 w-3.5" /></Button>
            <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => void remove(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        )
      }
    ],
    [byId, metrics, setEnabled, remove]
  )

  const triggerColumns = useMemo<Column<AlertTrigger>[]>(
    () => [
      { key: 'time', header: 'Time', width: '150px', render: (t) => <span className="num text-fg-muted">{formatDateTime(t.triggeredAt)}</span>, sortValue: (t) => t.triggeredAt },
      { key: 'msg', header: 'Alert', width: 'minmax(200px, 1fr)', render: (t) => <span>{t.message}</span> }
    ],
    []
  )

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-xs text-fg-muted">
          {rules.filter((r) => r.enabled).length} active · {rules.length} total
        </span>
        {!notificationsEnabled && (
          <button type="button" className="flex items-center gap-1 rounded-md bg-warning-soft px-2 py-1 text-[11px] text-warning" onClick={() => navigate({ page: 'settings' })}>
            <BellOff className="h-3 w-3" /> Desktop notifications are disabled in Settings — alerts will still be recorded here.
          </button>
        )}
        <Button variant="primary" size="sm" className="ml-auto" onClick={() => setDialog({ open: true, initial: null })}>
          <Plus className="h-3.5 w-3.5" /> New alert
        </Button>
      </div>
      {error && <div className="rounded-md border border-negative/40 bg-negative-soft px-3 py-2 text-xs text-negative">{error}</div>}

      {rules.length === 0 ? (
        <EmptyState icon={Bell} title="No alerts yet" description="Get notified when a price, 24h change, volatility, volume or RSI condition is crossed. Alerts are evaluated locally every time market data refreshes." action={<Button variant="primary" onClick={() => setDialog({ open: true, initial: null })}><Plus className="h-3.5 w-3.5" /> Create your first alert</Button>} />
      ) : (
        <VirtualTable columns={columns} rows={rules} rowKey={(r) => String(r.id)} onRowClick={(r) => setDialog({ open: true, initial: r })} className="min-h-0 flex-1" />
      )}

      <Panel
        title={`Trigger history (${triggers.length})`}
        padded={false}
        className="h-56 shrink-0"
        actions={triggers.length > 0 && <Button size="xs" variant="ghost" onClick={() => void clearTriggers()}>Clear</Button>}
      >
        <VirtualTable columns={triggerColumns} rows={triggers} rowKey={(t) => String(t.id)} rowHeight={30} className="h-full rounded-none border-0" emptyMessage="No alerts have fired yet." />
      </Panel>

      <AlertDialog open={dialog.open} onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))} initial={dialog.initial} onSubmit={(input) => (dialog.initial ? update(dialog.initial.id, input) : create(input))} />
    </div>
  )
}
