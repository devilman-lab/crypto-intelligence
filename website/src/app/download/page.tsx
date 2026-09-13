import type { Metadata } from 'next'
import { Download, HardDrive, Monitor, ShieldCheck, Wifi } from 'lucide-react'
import { release } from '@/lib/release'

export const metadata: Metadata = { title: 'Download', description: 'Download Crypto Intelligence for Windows 10 and 11.' }

export default function DownloadPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">Download for Windows</h1>
      <p className="mt-3 text-fg-muted">Free. No account, no API keys, no exchange connection. Everything stays on your computer.</p>

      <div className="mt-8 rounded-xl border border-border bg-surface p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-lg font-semibold">Crypto Intelligence {release.version}</div>
            <div className="mt-1 text-sm text-fg-muted">
              {release.fileName} · {release.sizeLabel} · released {release.date}
            </div>
          </div>
          <a href={release.downloadUrl} className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-bg hover:brightness-110">
            <Download className="h-4 w-4" /> Download installer
          </a>
        </div>
        {release.sha256 && (
          <div className="mt-4 rounded-md bg-surface-2 px-3 py-2 font-mono text-[11px] text-fg-muted break-all">SHA-256 {release.sha256}</div>
        )}
        <p className="mt-4 text-xs text-fg-subtle">
          All releases, including previous versions, are published on the <a href={release.releasesUrl} className="text-accent hover:underline">releases page</a>.
        </p>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-border p-5">
          <Monitor className="h-5 w-5 text-accent" />
          <div className="mt-3 font-medium">System requirements</div>
          <ul className="mt-2 space-y-1 text-sm text-fg-muted">
            {release.requirements.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-border p-5">
          <HardDrive className="h-5 w-5 text-accent" />
          <div className="mt-3 font-medium">Installation</div>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-fg-muted">
            <li>Run the installer and choose an install location.</li>
            <li>Launch Crypto Intelligence from the Start menu or desktop.</li>
            <li>Market data loads automatically — no set-up required.</li>
          </ol>
        </div>
        <div className="rounded-lg border border-border p-5">
          <ShieldCheck className="h-5 w-5 text-accent" />
          <div className="mt-3 font-medium">Windows SmartScreen</div>
          <p className="mt-2 text-sm text-fg-muted">Early releases may show a SmartScreen notice until the publisher builds reputation. Verify the SHA-256 checksum above if you want to be sure the file is intact.</p>
        </div>
        <div className="rounded-lg border border-border p-5">
          <Wifi className="h-5 w-5 text-accent" />
          <div className="mt-3 font-medium">Updates</div>
          <p className="mt-2 text-sm text-fg-muted">Check for new versions from Settings → Application. Updates are never installed without your confirmation.</p>
        </div>
      </div>
    </div>
  )
}
