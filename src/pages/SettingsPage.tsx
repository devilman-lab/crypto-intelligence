import { useEffect, useState } from 'react'
import { FolderOpen, FileText } from 'lucide-react'
import type { AppInfo } from '@shared/types'
import { useSettingsStore } from '@/stores/settingsStore'
import { api } from '@/lib/api'
import { Panel } from '@/components/ui/Panel'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { Button } from '@/components/ui/Button'
import { BackupPanel } from '@/components/settings/BackupPanel'
import { UpdateRow } from '@/components/settings/UpdateRow'

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2.5 last:border-b-0">
      <div>
        <div className="text-[13px]">{label}</div>
        {hint && <div className="text-[11px] text-fg-muted">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export function SettingsPage() {
  const { settings, update, error } = useSettingsStore()
  const [info, setInfo] = useState<AppInfo | null>(null)

  useEffect(() => {
    void api.app.getInfo().then(setInfo).catch(() => setInfo(null))
  }, [])

  return (
    <div className="mx-auto grid max-w-4xl grid-cols-1 items-start gap-4 lg:grid-cols-2">
      <Panel title="Appearance">
        <Row label="Theme">
          <Select
            value={settings.theme}
            onValueChange={(theme) => void update({ theme })}
            options={[
              { value: 'dark', label: 'Dark' },
              { value: 'light', label: 'Light' },
              { value: 'system', label: 'System' }
            ]}
            className="w-32"
          />
        </Row>
      </Panel>

      <Panel title="Market data">
        <Row label="Data provider" hint="Public market-data APIs. No API key required.">
          <Select
            value={settings.marketDataProvider}
            onValueChange={(marketDataProvider) => void update({ marketDataProvider })}
            options={[
              { value: 'coingecko', label: 'CoinGecko' },
              { value: 'binance', label: 'Binance (public)' }
            ]}
            className="w-40"
          />
        </Row>
        <Row label="Refresh interval">
          <Select
            value={String(settings.refreshIntervalSec) as '30' | '60' | '120' | '300'}
            onValueChange={(v) => void update({ refreshIntervalSec: Number(v) })}
            options={[
              { value: '30', label: '30 seconds' },
              { value: '60', label: '1 minute' },
              { value: '120', label: '2 minutes' },
              { value: '300', label: '5 minutes' }
            ]}
            className="w-32"
          />
        </Row>
        <Row label="Display currency" hint="Prices and P&L are converted for display. Values you enter are always in USD.">
          <Select
            value={settings.currency}
            aria-label="Display currency"
            onValueChange={(currency) => void update({ currency })}
            options={[
              { value: 'USD', label: 'USD' },
              { value: 'EUR', label: 'EUR' },
              { value: 'GBP', label: 'GBP' },
              { value: 'JPY', label: 'JPY' }
            ]}
            className="w-32"
          />
        </Row>
      </Panel>

      <Panel title="Notifications">
        <Row label="Desktop notifications" hint="Used by the alert engine when a condition is met.">
          <Switch checked={settings.notificationsEnabled} onCheckedChange={(notificationsEnabled) => void update({ notificationsEnabled })} />
        </Row>
      </Panel>

      <Panel title="Database">
        <div className="mb-2 rounded-md bg-accent-soft px-2.5 py-2 text-[11px] text-fg">
          Your portfolio and journal data are stored locally on your computer. Nothing is uploaded.
        </div>
        {info?.mode === 'portable' && (
          <div className="mb-2 rounded-md bg-warning-soft px-2.5 py-2 text-[11px] text-fg">
            <span className="font-semibold text-warning">Portable mode.</span> Data is stored next to the executable in <span className="num">{info.dataDir}</span>. Keep that folder together with the .exe when you move or replace it.
          </div>
        )}
        <Row label="Data location" hint={info?.dbPath ?? '…'}>
          <Button size="sm" onClick={() => info && void api.app.openPath(info.userDataPath)} disabled={!info}>
            <FolderOpen className="h-3.5 w-3.5" /> Open
          </Button>
        </Row>
        <Row label="Application log" hint={info?.logPath ?? '…'}>
          <Button size="sm" onClick={() => info && void api.app.openPath(info.logDir)} disabled={!info}>
            <FileText className="h-3.5 w-3.5" /> Open
          </Button>
        </Row>
      </Panel>

      <Panel title="Backup & export" className="lg:col-span-2">
        <BackupPanel />
      </Panel>

      <Panel title="Application" className="lg:col-span-2">
        <Row label="Version">
          <span className="num text-xs">{info ? `${info.version} · Electron ${info.electronVersion}` : '…'}</span>
        </Row>
        <Row label="Distribution" hint={info?.mode === 'portable' ? 'Single-executable portable build' : info?.mode === 'custom' ? 'Custom data directory (CRYPTO_INTELLIGENCE_DATA_DIR)' : 'Installed build'}>
          <span className="text-xs capitalize">{info?.mode ?? '…'}</span>
        </Row>
        <UpdateRow />
        <Row label="AI module" hint="Optional module for market summaries and natural-language screening. Not included in this version.">
          <Switch checked={false} onCheckedChange={() => undefined} disabled />
        </Row>
      </Panel>

      {error && <div className="rounded-md border border-negative/40 bg-negative-soft px-3 py-2 text-xs text-negative lg:col-span-2">{error}</div>}

      <p className="text-[11px] leading-relaxed text-fg-subtle lg:col-span-2">
        Crypto Intelligence is an analytical and educational software tool. It does not provide financial, investment, or trading advice. Market data and
        calculations may contain errors or delays. Past performance and historical observations do not guarantee future results. Users are solely
        responsible for their trading and investment decisions.
      </p>
    </div>
  )
}
