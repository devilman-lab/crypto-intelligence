import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'FAQ', description: 'Frequently asked questions about Crypto Intelligence.' }

const FAQ: { q: string; a: string }[] = [
  { q: 'Is Crypto Intelligence a trading bot?', a: 'No. It never places orders and never asks for exchange credentials. It is a research, analysis, simulation and portfolio-management tool. Paper trading is a clearly labelled simulation that only writes to your local database.' },
  { q: 'Where does market data come from?', a: "From public, keyless endpoints: CoinGecko for the asset universe, market caps and tickers, and Binance's public market-data API for candles. Data can be delayed or temporarily unavailable; the app shows when it is serving cached data." },
  { q: 'Do I need an account or an API key?', a: 'No. There is no sign-up and nothing to configure. Install it and it works.' },
  { q: 'Where is my data stored?', a: 'In a SQLite database in your Windows user profile (Settings → Database shows the exact path). Portfolio, journal, alerts, watchlists and settings never leave your computer. You can export a JSON backup or CSV files at any time.' },
  { q: 'Does it work offline?', a: 'Yes. Your holdings, journal, alerts and settings are always available, and the last market snapshot and candles are shown with an "Offline — showing cached data" indicator. Live data resumes automatically.' },
  { q: 'How is volatility calculated?', a: "As annualised realised volatility: the sample standard deviation of log returns over the window (24 hourly returns, 7 or 30 daily returns) multiplied by the square root of the number of periods in a 365-day year. Formulas are documented in the app's technical documentation. Volatility describes past price movement, not the future." },
  { q: 'Are screener results or alerts trading signals?', a: 'No. Screens and alerts describe current market conditions that match rules you defined. They are not recommendations, and historical analysis results are labelled as historical observations, not predictions.' },
  { q: 'Which currencies are supported?', a: 'Values are stored in USD and can be displayed in USD, EUR, GBP or JPY using live FX rates. Prices you enter (transactions, order sizes) are always in USD.' },
  { q: 'Can I import my exchange history?', a: 'Not in this version. Transactions are entered manually or restored from a Crypto Intelligence backup. Read-only exchange import is a possible future addition.' },
  { q: 'Is there an AI feature?', a: 'Not in this version. The application is designed so an optional AI module (market summaries, natural-language screener queries, journal analysis) can be added later, but nothing in the current release calls any AI service.' },
  { q: 'Which Windows versions are supported?', a: 'Windows 10 and Windows 11, 64-bit.' },
  { q: 'Is it free?', a: 'Yes, the desktop application is free to download and use.' }
]

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">Frequently asked questions</h1>
      <div className="mt-10 divide-y divide-border">
        {FAQ.map((f) => (
          <details key={f.q} className="group py-4">
            <summary className="cursor-pointer list-none text-base font-medium [&::-webkit-details-marker]:hidden">
              <span className="mr-2 inline-block text-accent transition-transform group-open:rotate-90">›</span>
              {f.q}
            </summary>
            <p className="mt-2 pl-5 text-sm leading-relaxed text-fg-muted">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  )
}
