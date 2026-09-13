import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Terms', description: 'Terms of use for Crypto Intelligence.' }

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">Terms of use</h1>
      <p className="mt-3 text-sm text-fg-subtle">Last updated 14 September 2026 · This wording should be reviewed by legal counsel before commercial launch.</p>
      <div className="mt-8 space-y-6 text-sm leading-relaxed text-fg-muted">
        <section>
          <h2 className="text-lg font-semibold text-fg">1. Nature of the software</h2>
          <p className="mt-2">Crypto Intelligence is an analytical and educational software tool. It does not provide financial, investment, tax, legal or trading advice, and nothing displayed by the application — including screener matches, alerts, indicator readings, volatility statistics, historical observations or paper-trading results — constitutes a recommendation to buy, sell or hold any asset.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-fg">2. No execution of trades</h2>
          <p className="mt-2">The application does not connect to exchanges, does not hold credentials and does not execute real transactions. Paper trading is a simulation with virtual balances and simplified assumptions (no slippage, funding or borrow costs) and does not represent achievable results.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-fg">3. Market data and calculations</h2>
          <p className="mt-2">Market data is obtained from third-party public sources and may be delayed, incomplete, inaccurate or unavailable. Calculations are performed on that data and may contain errors. Past performance and historical observations do not guarantee future results.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-fg">4. Your responsibility</h2>
          <p className="mt-2">You are solely responsible for your trading and investment decisions and for verifying any information before acting on it. You are responsible for backing up your own data.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-fg">5. Licence</h2>
          <p className="mt-2">You may install and use the application on devices you control for personal or internal business purposes. You may not redistribute modified copies presenting them as official releases.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-fg">6. Disclaimer of warranties and limitation of liability</h2>
          <p className="mt-2">The software is provided &quot;as is&quot; without warranties of any kind, express or implied, including fitness for a particular purpose. To the maximum extent permitted by law, the authors shall not be liable for any loss, including trading losses, arising from use of or inability to use the software or from reliance on any information it displays.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-fg">7. Third-party services</h2>
          <p className="mt-2">Use of market data is subject to the terms of the respective providers (CoinGecko, Binance). Their services may change or become unavailable at any time.</p>
        </section>
      </div>
    </div>
  )
}
