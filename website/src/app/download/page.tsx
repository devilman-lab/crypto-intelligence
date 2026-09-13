import type { Metadata } from 'next'
import { Download, HardDrive, Monitor, Package, ShieldCheck, Wifi } from 'lucide-react'
import { release, type Artifact } from '@/lib/release'

export const metadata: Metadata = { title: 'Download', description: 'Download Crypto Intelligence for Windows 10 and 11 — installer or portable executable.' }

function ArtifactCard({ a, recommended }: { a: Artifact; recommended?: boolean }) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface p-6">
      <div className="flex items-center gap-2">
        {a.kind === 'installer' ? <Package className="h-5 w-5 text-accent" /> : <HardDrive className="h-5 w-5 text-accent" />}
        <h2 className="text-lg font-semibold">{a.label}</h2>
        {recommended && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent">Recommended</span>}
      </div>
      <p className="mt-2 text-sm text-fg-muted">{a.description}</p>
      <ul className="mt-3 space-y-1 text-sm text-fg-muted">
        {a.notes.map((n) => (
          <li key={n} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />{n}</li>
        ))}
      </ul>
      <div className="mt-5 text-xs text-fg-subtle">
        {a.fileName} · {a.sizeLabel}
      </div>
      <a href={a.downloadUrl} className="mt-3 inline-flex items-center justify-center gap-2 rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-bg hover:brightness-110">
        <Download className="h-4 w-4" /> {release.assetsPublished ? `Download ${a.label.replace('Windows ', '')}` : 'Open releases page'}
      </a>
      {a.sha256 ? (
        <div className="mt-3 rounded-md bg-surface-2 px-3 py-2 font-mono text-[11px] text-fg-muted break-all">SHA-256 {a.sha256}</div>
      ) : (
        <div className="mt-3 text-[11px] text-fg-subtle">Checksum is published with the release.</div>
      )}
    </div>
  )
}

export default function DownloadPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">Download for Windows</h1>
      <p className="mt-3 text-fg-muted">
        Version {release.version} · released {release.date}. Free. No account, no API keys, no exchange connection — everything stays on your computer.
      </p>
      {!release.assetsPublished && (
        <p className="mt-3 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          The {release.version} files have not been uploaded to the releases page yet. The buttons below open the releases page.
        </p>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <ArtifactCard a={release.installer} recommended />
        <ArtifactCard a={release.portable} />
      </div>

      <p className="mt-4 text-xs text-fg-subtle">
        All releases, including previous versions, are published on the <a href={release.releasesUrl} className="text-accent hover:underline">releases page</a>. Always download from that page and compare the SHA-256 checksum shown here before running a file.
      </p>

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
          <div className="mt-3 font-medium">Using the portable version</div>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-fg-muted">
            <li>Copy the .exe to a folder you can write to (Documents, a USB drive…).</li>
            <li>Double-click it. A &quot;Crypto Intelligence Data&quot; folder is created next to it.</li>
            <li>To move or update, keep the .exe and that folder together. Back the folder up regularly.</li>
          </ol>
          <p className="mt-2 text-xs text-fg-subtle">Each launch unpacks the program to a temporary folder, so start-up takes a few seconds longer than the installed version. Running from a network share is not recommended.</p>
        </div>
        <div className="rounded-lg border border-border p-5">
          <ShieldCheck className="h-5 w-5 text-accent" />
          <div className="mt-3 font-medium">Windows SmartScreen</div>
          <p className="mt-2 text-sm text-fg-muted">Both files are currently unsigned, so Windows SmartScreen may show a warning for either of them until the publisher has built reputation. Verify the download source and the SHA-256 checksum before choosing to run.</p>
        </div>
        <div className="rounded-lg border border-border p-5">
          <Wifi className="h-5 w-5 text-accent" />
          <div className="mt-3 font-medium">Updates</div>
          <p className="mt-2 text-sm text-fg-muted">The installed version checks for new versions from Settings → Application and never installs without your confirmation. The portable version does not update itself: download the new portable .exe and replace the old one — your data folder is kept.</p>
        </div>
      </div>
    </div>
  )
}
