import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Download } from 'lucide-react'
import { FEATURES } from '@/components/features'

export const metadata: Metadata = { title: 'Features', description: 'Market intelligence, volatility scanner, technical analysis, screener, portfolio tracking, paper trading, trading journal, smart alerts and historical analysis.' }

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">Features</h1>
      <p className="mt-3 max-w-2xl text-fg-muted">Every screen below is a real capture of the application. Nothing is mocked up.</p>
      <nav className="mt-6 flex flex-wrap gap-2">
        {FEATURES.map((f) => (
          <a key={f.slug} href={`#${f.slug}`} className="rounded-full border border-border px-3 py-1 text-xs text-fg-muted hover:border-border-strong hover:text-fg">
            {f.title}
          </a>
        ))}
      </nav>
      <div className="mt-16 space-y-24">
        {FEATURES.map((f, i) => (
          <section key={f.slug} id={f.slug} className={`grid scroll-mt-20 items-center gap-8 md:grid-cols-2 ${i % 2 ? 'md:[&>div:first-child]:order-2' : ''}`}>
            <div>
              <f.icon className="h-6 w-6 text-accent" />
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">{f.title}</h2>
              <p className="mt-1 text-fg-muted">{f.tagline}</p>
              <p className="mt-4 text-sm leading-relaxed text-fg-muted">{f.description}</p>
              <ul className="mt-4 space-y-1.5 text-sm">
                {f.bullets.map((b) => (
                  <li key={b} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />{b}</li>
                ))}
              </ul>
            </div>
            <div className="overflow-hidden rounded-lg border border-border-strong shadow-xl shadow-black/40">
              <Image src={f.screenshot} alt={`${f.title} screen`} width={1800} height={1125} className="block w-full" />
            </div>
          </section>
        ))}
      </div>
      <div className="mt-24 rounded-xl border border-border bg-surface p-8 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Also included</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-fg-muted">Multiple watchlists with reordering · dark and light themes · display currency in USD, EUR, GBP or JPY · JSON backup and restore · CSV export of transactions, holdings, journal and paper trades · offline mode with cached data.</p>
        <Link href="/download/" className="mt-6 inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-bg hover:brightness-110">
          <Download className="h-4 w-4" /> Download for Windows
        </Link>
      </div>
    </div>
  )
}
