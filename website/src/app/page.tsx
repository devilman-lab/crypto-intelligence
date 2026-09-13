import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Download, Lock, ShieldCheck, WifiOff } from 'lucide-react'
import { FEATURES } from '@/components/features'
import { release } from '@/lib/release'

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="grid-bg absolute inset-0 -z-10" />
        <div className="mx-auto max-w-6xl px-5 pb-10 pt-20 text-center md:pt-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-fg-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-positive" /> Windows desktop app · No account · No API keys
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">Understand the Crypto Market Before You Trade.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-fg-muted">A powerful desktop analytics platform for cryptocurrency traders and investors.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/download/" className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-bg hover:brightness-110">
              <Download className="h-4 w-4" /> Download for Windows
            </Link>
            <Link href="/features/" className="inline-flex items-center gap-2 rounded-md border border-border-strong px-5 py-2.5 text-sm font-medium hover:bg-surface-2">
              Explore Features <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <p className="mt-3 text-xs text-fg-subtle">
            Version {release.version} · Windows 10 / 11 · Free
          </p>
        </div>
        <div className="mx-auto max-w-6xl px-5 pb-16">
          <div className="overflow-hidden rounded-xl border border-border-strong bg-surface shadow-2xl shadow-black/50">
            <Image src="/screenshots/dashboard.png" alt="Crypto Intelligence dashboard showing portfolio value, market trend, top gainers and losers, volatility ranking and alerts" width={1800} height={1125} priority className="block w-full" />
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="border-y border-border bg-surface/50">
        <div className="mx-auto grid max-w-6xl gap-6 px-5 py-10 md:grid-cols-3">
          {[
            { icon: Lock, title: 'Local-first', text: 'Your portfolio and journal data are stored locally on your computer. Nothing is uploaded and no account is needed.' },
            { icon: ShieldCheck, title: 'Research, not a bot', text: 'Crypto Intelligence never places real trades and never asks for exchange credentials. Paper trading is clearly labelled as simulation.' },
            { icon: WifiOff, title: 'Works offline', text: 'Cached market data, your holdings, journal and settings stay available without a connection. Live data resumes automatically.' }
          ].map((p) => (
            <div key={p.title} className="flex gap-3">
              <p.icon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <div>
                <div className="font-medium">{p.title}</div>
                <p className="mt-1 text-sm text-fg-muted">{p.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature grid */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="text-center text-3xl font-semibold tracking-tight">Everything a trader needs to study the market</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-fg-muted">Nine focused tools in one window — from a live market table to a journal of your own decisions.</p>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Link key={f.slug} href={`/features/#${f.slug}`} className="group rounded-lg border border-border bg-surface p-5 transition-colors hover:border-border-strong hover:bg-surface-2">
              <f.icon className="h-5 w-5 text-accent" />
              <div className="mt-3 font-semibold">{f.title}</div>
              <p className="mt-1 text-sm text-fg-muted">{f.tagline}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs text-accent opacity-0 transition-opacity group-hover:opacity-100">
                Learn more <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Showcase */}
      <section className="border-t border-border bg-surface/40">
        <div className="mx-auto max-w-6xl space-y-20 px-5 py-20">
          {FEATURES.filter((f) => ['volatility', 'analysis', 'screener'].includes(f.slug)).map((f, i) => (
            <div key={f.slug} className={`grid items-center gap-8 md:grid-cols-2 ${i % 2 ? 'md:[&>div:first-child]:order-2' : ''}`}>
              <div>
                <f.icon className="h-6 w-6 text-accent" />
                <h3 className="mt-3 text-2xl font-semibold tracking-tight">{f.title}</h3>
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
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 py-20 text-center">
        <h2 className="text-3xl font-semibold tracking-tight">Ready to study the market properly?</h2>
        <p className="mx-auto mt-3 max-w-xl text-fg-muted">Free download for Windows. Installs in a minute, keeps everything on your machine.</p>
        <Link href="/download/" className="mt-8 inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-bg hover:brightness-110">
          <Download className="h-4 w-4" /> Download for Windows
        </Link>
      </section>
    </>
  )
}
