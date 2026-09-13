import Link from 'next/link'
import { Logo } from './Logo'
import { release } from '@/lib/release'

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2">
              <Logo className="h-6 w-6" />
              <span className="font-semibold">Crypto Intelligence</span>
            </div>
            <p className="mt-3 text-sm text-fg-muted">Crypto Market Analytics for Traders &amp; Investors. Local-first desktop software for Windows.</p>
            <p className="mt-2 text-xs text-fg-subtle">Version {release.version} · Released {release.date}</p>
          </div>
          <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
            <div>
              <div className="mb-2 font-medium">Product</div>
              <ul className="space-y-1.5 text-fg-muted">
                <li><Link href="/features/" className="hover:text-fg">Features</Link></li>
                <li><Link href="/download/" className="hover:text-fg">Download</Link></li>
                <li><Link href="/faq/" className="hover:text-fg">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <div className="mb-2 font-medium">Legal</div>
              <ul className="space-y-1.5 text-fg-muted">
                <li><Link href="/privacy/" className="hover:text-fg">Privacy</Link></li>
                <li><Link href="/terms/" className="hover:text-fg">Terms</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <p className="mt-10 max-w-3xl text-xs leading-relaxed text-fg-subtle">
          Crypto Intelligence is an analytical and educational software tool. It does not provide financial, investment, or trading advice. Market data and calculations may contain errors or delays. Past performance and historical observations do not guarantee future results. Users are solely responsible for their trading and investment decisions.
        </p>
      </div>
    </footer>
  )
}
