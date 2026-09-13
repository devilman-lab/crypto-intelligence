import { useState } from 'react'
import type { UpdateStatus } from '@shared/ipc'
import { api, errorMessage } from '@/lib/api'
import { Button } from '@/components/ui/Button'

/** "Check for updates" control backed by the main-process UpdateService. */
export function UpdateRow() {
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  const [busy, setBusy] = useState(false)

  const run = async (fn: () => Promise<UpdateStatus>) => {
    setBusy(true)
    try {
      setStatus(await fn())
    } catch (err) {
      setStatus({ state: 'error', message: errorMessage(err) })
    } finally {
      setBusy(false)
    }
  }

  const label = !status
    ? null
    : status.state === 'unavailable'
      ? status.reason
      : status.state === 'checking'
        ? 'Checking…'
        : status.state === 'up-to-date'
          ? `You are on the latest version (${status.version}).`
          : status.state === 'available'
            ? `Version ${status.version} is available.`
            : status.state === 'downloaded'
              ? `Version ${status.version} is ready to install.`
              : status.message

  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2.5 last:border-b-0">
      <div>
        <div className="text-[13px]">Check for updates</div>
        <div className="text-[11px] text-fg-muted">{label ?? 'Updates are delivered through the release channel and never installed without your confirmation.'}</div>
      </div>
      <div className="flex shrink-0 gap-1.5">
        {status?.state === 'available' && (
          <Button size="sm" variant="primary" disabled={busy} onClick={() => void run(() => api.app.downloadUpdate())}>
            Download
          </Button>
        )}
        {status?.state === 'downloaded' && (
          <Button size="sm" variant="primary" disabled={busy} onClick={() => void api.app.installUpdate()}>
            Restart & install
          </Button>
        )}
        <Button size="sm" disabled={busy} onClick={() => void run(() => api.app.checkForUpdates())}>
          Check now
        </Button>
      </div>
    </div>
  )
}
