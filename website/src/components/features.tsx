import { Activity, Bell, Briefcase, CandlestickChart, Filter, FlaskConical, History, LineChart, NotebookPen, type LucideIcon } from 'lucide-react'

export interface Feature {
  slug: string
  icon: LucideIcon
  title: string
  tagline: string
  description: string
  bullets: string[]
  screenshot: string
}

/** Every claim here describes a shipped feature; screenshots are captured from the actual application. */
export const FEATURES: Feature[] = [
  {
    slug: 'markets',
    icon: CandlestickChart,
    title: 'Market Intelligence',
    tagline: 'Monitor crypto markets in one place.',
    description: 'The top 250 assets by market cap with price, 1h/24h/7d change, market cap, volume, 7-day volatility and daily RSI in one sortable, searchable table. Open any asset for a full candlestick chart from 1-minute to weekly candles.',
    bullets: ['Live tickers refreshed on your schedule (30 s to 5 min)', 'Candles for 1m, 5m, 15m, 1h, 4h, 1d and 1w', 'Cached data keeps working when you are offline'],
    screenshot: '/screenshots/markets.png'
  },
  {
    slug: 'volatility',
    icon: Activity,
    title: 'Volatility Scanner',
    tagline: 'Find assets experiencing unusual volatility.',
    description: 'Annualised realised volatility over 24 hours, 7 days and 30 days, with change versus the previous window, a percentile against the trailing year and ATR as a percentage of price. Rank the market or view it as a market-cap-weighted heatmap.',
    bullets: ['Mathematically documented formulas (log returns, sample standard deviation, √365 annualisation)', 'Heatmap: tile size = market cap, colour = volatility', 'Stablecoins filtered out by default'],
    screenshot: '/screenshots/volatility.png'
  },
  {
    slug: 'analysis',
    icon: LineChart,
    title: 'Technical Analysis',
    tagline: 'Analyze price action using professional indicators.',
    description: 'SMA, EMA, Bollinger Bands and VWAP overlays; RSI, MACD, Stochastic and ATR in their own panes; a readings table with current values and plain descriptions. Every indicator is computed in the app and unit-tested against reference values.',
    bullets: ['Interactive chart: zoom, pan, timeframe and indicator toggles', 'Readings for momentum, trend and volatility at a glance', 'Preferences remembered between sessions'],
    screenshot: '/screenshots/analysis.png'
  },
  {
    slug: 'screener',
    icon: Filter,
    title: 'Market Screener',
    tagline: 'Filter the market according to your own conditions.',
    description: 'Combine conditions over price, volume, volatility, momentum and trend fields with AND / OR logic. Start from presets such as High Volatility, Oversold, Momentum, Volume Spike or Breakout Candidates, then save your own screens.',
    bullets: ['20 fields including RSI, Bollinger %B, volume vs 30-day average, distance from SMA 50/200', 'Results update instantly as market data refreshes', 'Screens describe conditions — they are never presented as signals'],
    screenshot: '/screenshots/screener.png'
  },
  {
    slug: 'portfolio',
    icon: Briefcase,
    title: 'Portfolio Tracking',
    tagline: 'Understand your holdings and performance.',
    description: 'Record buys, sells, deposits and withdrawals across multiple portfolios. Weighted-average cost basis, unrealised and realised P&L, 24-hour P&L, fees and allocation — all computed locally from your own transaction history.',
    bullets: ['Multiple portfolios (e.g. Long-term, Trading, Experimental)', 'Allocation chart and per-asset P&L', 'No exchange connection required'],
    screenshot: '/screenshots/portfolio.png'
  },
  {
    slug: 'paper',
    icon: FlaskConical,
    title: 'Paper Trading',
    tagline: 'Test strategies without risking real money.',
    description: 'A simulated account with configurable starting capital and fee rate. Open longs and shorts at live prices, close partially or fully, and track win rate, profit factor, average win/loss and maximum drawdown.',
    bullets: ['Clearly labelled simulation — never connected to an exchange', 'Fills use the latest market price held by the app', 'Reset the account any time'],
    screenshot: '/screenshots/paper.png'
  },
  {
    slug: 'journal',
    icon: NotebookPen,
    title: 'Trading Journal',
    tagline: 'Analyze your own trading behavior.',
    description: 'Log each trade with entry and exit, strategy, reasons, emotion, tags and notes. Filter by asset, strategy, side, result or date, and review win rate, expectancy, profit factor, best and worst trades and drawdown.',
    bullets: ['Automatic P&L and result from your entries', 'Emotion tracking to spot patterns', 'Export to CSV for your own analysis'],
    screenshot: '/screenshots/journal.png'
  },
  {
    slug: 'alerts',
    icon: Bell,
    title: 'Smart Alerts',
    tagline: 'Know when important market conditions occur.',
    description: 'Price, 24-hour change, volatility, volume-versus-average and RSI alerts, evaluated locally every time market data refreshes. Get a desktop notification when a condition is crossed, once or every time.',
    bullets: ['Edge-triggered so you are notified about the crossing, not spammed', 'Trigger history kept locally', 'Works alongside your watchlists'],
    screenshot: '/screenshots/alerts.png'
  },
  {
    slug: 'history',
    icon: History,
    title: 'Historical Analysis',
    tagline: 'See what followed similar conditions in the past.',
    description: '"When BTC 7-day volatility exceeded 60%, what happened over the following 7 days?" Count occurrences, average and median subsequent return, share of positive outcomes, extremes and the full distribution — always labelled as historical observations.',
    bullets: ['Up to ~2.7 years of daily candles per asset', 'Conditions on volatility, RSI, daily change, volume and drawdown', 'Compared against the unconditional baseline'],
    screenshot: '/screenshots/history.png'
  }
]
