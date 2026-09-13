import { useState } from 'react'
import { Download, FileJson, FileSpreadsheet, Upload } from 'lucide-react'
import type { BackupSummary, CsvDataset, ImportMode } from '@shared/types'
import { api, errorMessage } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Select } from '@/components/ui/Select'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/cn'

const CSV_OPTIONS: { value: CsvDataset; label: string }[] = [
  { value: 'transactions', label: 'Portfolio transactions' },
  { value: 'holdings', label: 'Portfolio holdings' },
  { value: 'journal', label: 'Trading journal' },
  { value: 'paperTrades', label: 'Paper trades' }
]

/** Backup / export / restore controls for the Settings page. */
export function BackupPanel() {
  const [csv, setCsv] = useState<CsvDataset>('transactions')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [pending, setPending] = useState<BackupSummary | null>(null)
  const [mode, setMode] = useState<ImportMode>('merge')

  const run = async (label: string, fn: () => Promise<string | null>) => {
    setBusy(true)
    setMessage(null)
    try {
      const path = await fn()
      setMessage(path ? { tone: 'ok', text: `${label} saved to ${path}` } : null)
    } catch (err) {
      setMessage({ tone: 'error', text: errorMessage(err) })
    } finally {
      setBusy(false)
    }
  }

  const pick = async () => {
    setBusy(true)
    setMessage(null)
    try {
      const summary = await api.backup.pickImport()
      if (summary) {
        setPending(summary)
        setMode('merge')
      }
    } catch (err) {
      setMessage({ tone: 'error', text: errorMessage(err) })
    } finally {
      setBusy(false)
    }
  }

  const apply = async () => {
    if (!pending) return
    setBusy(true)
    try {
      const s = await api.backup.applyImport(mode)
      setMessage({ tone: 'ok', text: `Restored ${s.counts.transactions} transactions, ${s.counts.journal} journal entries, ${s.counts.alerts} alerts, ${s.counts.watchlists} watchlists (${mode}).` })
      setPending(null)
    } catch (err) {
      setMessage({ tone: 'error', text: errorMessage(err) })
    } finally {
      setBusy(false)
    }
  }

  const cancel = () => {
    void api.backup.cancelImport()
    setPending(null)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4 border-b border-border py-2.5">
        <div>
          <div className="text-[13px]">Full backup (JSON)</div>
          <div className="text-[11px] text-fg-muted">Settings, watchlists, screens, portfolios, paper trading, journal and alerts.</div>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Button size="sm" disabled={busy} onClick={() => void run('Backup', () => api.backup.exportJson())}>
            <FileJson className="h-3.5 w-3.5" /> Export
          </Button>
          <Button size="sm" disabled={busy} onClick={() => void pick()}>
            <Upload className="h-3.5 w-3.5" /> Restore…
          </Button>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 py-2.5">
        <div>
          <div className="text-[13px]">Export dataset (CSV)</div>
          <div className="text-[11px] text-fg-muted">Opens in Excel, Google Sheets or any spreadsheet.</div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Select value={csv} options={CSV_OPTIONS} onValueChange={setCsv} className="w-44" />
          <Button size="sm" disabled={busy} onClick={() => void run('CSV', () => api.backup.exportCsv(csv))}>
            <FileSpreadsheet className="h-3.5 w-3.5" /> Export
          </Button>
        </div>
      </div>
      {message && <div className={cn('rounded-md px-2.5 py-1.5 text-[11px]', message.tone === 'ok' ? 'bg-positive-soft text-positive' : 'bg-negative-soft text-negative')}>{message.text}</div>}

      <Dialog
        open={pending !== null}
        onOpenChange={(o) => !o && cancel()}
        title="Restore backup"
        description={pending ? `Backup from ${formatDateTime(pending.exportedAt)} (app ${pending.appVersion}).` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={cancel}>Cancel</Button>
            <Button variant={mode === 'replace' ? 'danger' : 'primary'} disabled={busy} onClick={() => void apply()}>
              <Download className="h-3.5 w-3.5" /> {mode === 'replace' ? 'Replace all data' : 'Merge into my data'}
            </Button>
          </>
        }
      >
        {pending && (
          <div className="space-y-3 text-xs">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
              {Object.entries(pending.counts).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-fg-muted capitalize">{k.replace(/([A-Z])/g, ' $1').toLowerCase()}</dt>
                  <dd className="num">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="space-y-1.5">
              <label className={cn('flex cursor-pointer gap-2 rounded-md border p-2', mode === 'merge' ? 'border-accent bg-accent-soft' : 'border-border')}>
                <input type="radio" name="mode" checked={mode === 'merge'} onChange={() => setMode('merge')} />
                <span><span className="font-medium">Merge</span> — add the backup's records to what is already here. Nothing is deleted.</span>
              </label>
              <label className={cn('flex cursor-pointer gap-2 rounded-md border p-2', mode === 'replace' ? 'border-negative bg-negative-soft' : 'border-border')}>
                <input type="radio" name="mode" checked={mode === 'replace'} onChange={() => setMode('replace')} />
                <span><span className="font-medium text-negative">Replace</span> — delete all current watchlists, screens, portfolios, paper trading, journal entries and alerts first. This cannot be undone.</span>
              </label>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
