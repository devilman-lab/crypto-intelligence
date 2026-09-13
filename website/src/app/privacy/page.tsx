import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Privacy', description: 'How Crypto Intelligence handles your data.' }

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">Privacy</h1>
      <p className="mt-3 text-sm text-fg-subtle">Last updated 14 September 2026</p>
      <div className="mt-8 space-y-6 text-sm leading-relaxed text-fg-muted">
        <section>
          <h2 className="text-lg font-semibold text-fg">Summary</h2>
          <p className="mt-2">Crypto Intelligence is local-first software. Your portfolio, transactions, journal entries, alerts, watchlists, paper-trading records and settings are stored only on your computer. We do not operate a server that receives this data, and the application has no account system, telemetry or analytics.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-fg">Data stored on your device</h2>
          <p className="mt-2">All application data lives in a SQLite database in your Windows user profile (the path is shown in Settings → Database), together with a diagnostic log that records operational events (for example, that a market-data request failed). The log never contains portfolio contents, journal text or personal information. Uninstalling the application does not delete this folder; you can remove it manually.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-fg">Network requests</h2>
          <p className="mt-2">To show market data, the application requests publicly available information from third-party providers (CoinGecko and Binance public market-data APIs). These requests contain only the assets and timeframes being loaded; they never include your holdings, journal or any identifier. The providers&apos; own privacy policies apply to their handling of ordinary web-request metadata such as your IP address. Asset logos are loaded from the provider&apos;s image servers.</p>
          <p className="mt-2">If you use &quot;Check for updates&quot;, the application contacts the release server to compare version numbers. No other network communication takes place.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-fg">Backups and exports</h2>
          <p className="mt-2">Backup and CSV files are written only where you choose to save them. You are responsible for the storage and sharing of files you export.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-fg">This website</h2>
          <p className="mt-2">This website is static and does not set cookies or run analytics scripts.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-fg">Changes</h2>
          <p className="mt-2">If a future version changes how data is handled (for example, an optional cloud feature), this page and the application&apos;s release notes will describe it before it takes effect, and any such feature will be opt-in.</p>
        </section>
      </div>
    </div>
  )
}
