import Link from 'next/link'
import { Download } from 'lucide-react'
import { Logo } from './Logo'

const NAV = [
  { href: '/features/', label: 'Features' },
  { href: '/download/', label: 'Download' },
  { href: '/faq/', label: 'FAQ' }
]

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo />
          <span className="text-[15px] font-semibold tracking-tight">Crypto Intelligence</span>
        </Link>
        <nav className="flex items-center gap-1">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-md px-3 py-1.5 text-sm text-fg-muted hover:bg-surface-2 hover:text-fg">
              {n.label}
            </Link>
          ))}
          <Link href="/download/" className="ml-2 inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg hover:brightness-110">
            <Download className="h-4 w-4" /> Download
          </Link>
        </nav>
      </div>
    </header>
  )
}
