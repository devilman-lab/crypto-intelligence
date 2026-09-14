# Marketing copy kit — Crypto Intelligence 0.1.0

Everything below describes shipped features only. Replace `SITE_URL` with the deployed website address before posting.

- Website: `SITE_URL` (currently https://crypto-intelligence-iota.vercel.app)
- Releases: https://github.com/devilman-lab/crypto-intelligence/releases
- Screenshots for posts: `website/public/screenshots/*.png` (dashboard, markets, analysis, volatility, screener, portfolio, paper, journal, alerts, history)

## Positioning

- **Product:** a free, local-first Windows desktop app for studying the crypto market — not a bot, not a signal service.
- **One line:** Understand the crypto market before you trade.
- **Who it's for:** self-directed traders and investors who want real market data, real indicators and a record of their own decisions, without handing anyone an API key.
- **Why it's different (say these, in this order):** your data never leaves your PC · no account, no API keys · works offline with cached data · one file to run (portable) · the maths is documented and unit-tested.

## One-liners

- Understand the crypto market before you trade. Free Windows desktop app, no account, your data stays on your machine.
- Markets, volatility, screener, charts, portfolio, paper trading, journal and alerts — in one window, offline-capable, free.
- A research desk for crypto, not a bot: it never trades and never asks for exchange keys.
- Find out what actually happened the last 21 times BTC's 7-day volatility crossed 60%. Then decide.

## Discord — short announcement (fits one message)

```
**Crypto Intelligence** — a free desktop app for studying the crypto market (Windows 10/11)

What it does:
• Live table of the top 250 assets with 24h/7d change, volume, 7-day volatility and daily RSI
• Candlestick charts 1m–1w with SMA/EMA/Bollinger/VWAP, RSI, MACD, Stochastic, ATR
• Volatility ranking + market-cap heatmap (24h / 7d / 30d, annualised)
• Screener with AND/OR conditions and presets (Oversold, Volume Spike, Breakout Candidates…)
• Historical analysis: "when X happened before, what followed in the next N days?"
• Portfolio with cost basis & P&L, paper trading (long/short, fees, drawdown), trading journal, price/volatility/volume/RSI alerts

What it doesn't do: trade for you, ask for exchange keys, or upload your data. Everything is stored in a local SQLite file. Works offline with cached data.

Free download (installer or single portable .exe): SITE_URL
Not financial advice — it's an analysis tool, and the stats describe the past, not the future.
```

## Discord — one-paragraph pitch (for #self-promo / #tools channels)

```
Built a free Windows app for people who'd rather look at the market than at a bot's promises: Crypto Intelligence. It pulls public market data for the top 250 coins, charts them with the usual indicators, ranks the whole market by realised volatility, screens with your own conditions, and keeps a local portfolio, paper-trading account and trading journal so you can measure your own decisions. No account, no API keys, nothing uploaded — there's even a single-file portable .exe you can run from a USB stick. SITE_URL — happy to answer questions here.
```

## Reddit / forum post (long form)

**Title:** I built a free, local-first desktop app for crypto market research (no account, no API keys, Windows)

```
I wanted one window where I could watch the market, check volatility, run a screener and keep an honest record of my own trades — without giving anyone an exchange key or creating an account. Nothing did all of that locally, so I built it.

Crypto Intelligence (Windows 10/11, free):

Market
- Top 250 assets: price, 1h/24h/7d change, market cap, volume, 7-day volatility, daily RSI. Sortable, searchable, star to a watchlist.
- Candles from 1 minute to 1 week. Overlays: SMA, EMA, Bollinger Bands, VWAP. Panes: RSI, MACD, Stochastic, ATR. A readings table explains the current values in plain words.
- Volatility page: annualised realised volatility over 24h / 7d / 30d, change vs the previous window, percentile vs the last year, ATR%. Ranking table and a market-cap heatmap.
- Screener: combine 20 fields (RSI, Bollinger %B, volume vs 30-day average, distance from SMA 50/200, volatility, change…) with AND/OR. Presets included, save your own.
- Historical analysis: pick a condition ("7d volatility above 60%", "daily change below −8%", "RSI below 30"…) and see every past occurrence with the return over the next 1–30 days: count, mean, median, share positive, max gain/loss, distribution.

Personal
- Portfolio: multiple portfolios, buys/sells/deposits/withdrawals, weighted-average cost basis, unrealised/realised/24h P&L, allocation chart.
- Paper trading: virtual account, long and short at live prices, fees, partial closes, win rate, profit factor, max drawdown. Clearly a simulation — it's not connected to any exchange.
- Trading journal: entry/exit, strategy, reasons, emotion, tags; filters; win rate, expectancy, profit factor, drawdown.
- Alerts: price, 24h change, volatility, volume vs average, RSI. Desktop notifications, once or repeating.

The boring-but-important parts
- Local-first: everything is in a SQLite file on your PC. No telemetry, no account. JSON backup/restore and CSV export.
- Works offline with the last cached data and tells you when it's cached.
- Market data comes from CoinGecko and Binance's public endpoints (keyless). It can be delayed or rate-limited; the app shows its status.
- Two downloads: a normal installer, or a single portable .exe that keeps its data in a folder next to itself.
- The indicator and volatility formulas are documented and unit-tested (RSI is checked against the standard published reference series).

Honest caveats: Windows only for now; the executables are unsigned, so SmartScreen may warn on first run (checksums are on the download page); some smaller coins only get 24h/7d volatility until enough daily history is cached. And obviously: it's an analysis tool, not advice — historical stats describe the past, not the future.

Download: SITE_URL
Feedback very welcome, especially on the volatility and historical-analysis pages.
```

## X / Twitter (≤ 280 characters each)

- Free Windows app for crypto market research: 250-asset market table, indicators, volatility heatmap, screener, historical "what happened next" studies, portfolio, paper trading, journal, alerts. No account, no API keys, data stays local. SITE_URL
- "When BTC's 7-day volatility crossed 60%, what happened over the next 7 days?" Crypto Intelligence answers that from real candles — with counts, median return and the distribution. Free, local, Windows. SITE_URL
- Stop pasting exchange keys into random dashboards. Crypto Intelligence runs on your PC, reads public market data, and keeps your portfolio, journal and alerts in a local file. Free. SITE_URL

## Feature → benefit (for landing copy, carousels, replies)

| Feature | What it means for you |
| --- | --- |
| Local-first SQLite database | Your holdings and journal are never on anyone's server. Uninstall keeps your data. |
| No account, no API keys | Nothing to sign up for, nothing that can leak. |
| Offline mode | Open it on the train; cached prices, your portfolio and journal are all there. |
| Portable single .exe | Run it from a USB stick or a locked-down work PC without installing anything. |
| Volatility engine | See which assets are actually moving, not which are trending on social media. |
| Screener with presets | Turn "oversold and volume spiking" into a list in one click, then save the screen. |
| Historical analysis | Replace gut feeling with a count: how often, how big, how often it went wrong. |
| Paper trading with fees and drawdown | Test an idea for a month before it costs money. |
| Journal with emotion tagging | Find out whether your losses cluster around "FOMO" or "revenge". |
| Edge-triggered alerts | One notification when the level is crossed — not one every minute it stays there. |
| Documented, tested maths | The RSI, ATR and volatility numbers are the standard formulas, verifiable in the docs. |

## Ready replies to common questions

- **Is it a bot / does it trade?** No. It never places orders and never asks for exchange credentials. Paper trading is a labelled simulation that only writes to your local database.
- **Where does the data come from?** CoinGecko (asset list, market caps, tickers) and Binance's public market-data API (candles). Both keyless. Data can be delayed or rate-limited; the app shows when it's serving cached data.
- **Is it free? Catch?** Free. No account, no upsell inside the app. It's Windows-only right now.
- **Windows says "unrecognized app".** The executables aren't code-signed yet, so SmartScreen warns on first run. Compare the SHA-256 on the download page with the file, then "More info → Run anyway". Signing is planned.
- **Mac / Linux?** Not yet. Windows 10/11 only.
- **Can it import my Binance/Coinbase history?** Not in this version — transactions are entered manually, or restored from a backup. Read-only import is on the list.
- **Does it use AI?** No. It's designed so an optional AI module can be added later, but nothing in this release calls any AI service.
- **Is the volatility number a prediction?** No. It's realised (historical) volatility — a statistic of past price movement. Same for the historical-analysis page: it reports what followed past occurrences, and says so on the page.

## Claims to avoid (they're false or legally risky)

- ❌ "Predicts price", "finds winning trades", "guaranteed", "beats the market", "signals".
- ❌ "Open source" (the licence is not open source), "no SmartScreen warning", "works on any computer".
- ❌ "Real-time" — say "live public market data, refreshed every 30 s–5 min".
- ❌ Any screenshot with invented numbers — only use captures from the actual app.
- ✅ Always keep one line of disclaimer in long posts: *Crypto Intelligence is an analysis tool, not financial advice; historical observations do not predict future results.*

## Community etiquette checklist

1. Read the server's #rules — many require asking a mod before self-promo.
2. Post in the channel meant for tools/projects, once. Don't cross-post the same text to five channels.
3. Lead with what it does for them, then the link. Attach one real screenshot (dashboard or volatility heatmap).
4. Stay in the thread and answer questions; the "ready replies" above cover most of them.
5. Ask for feedback on one specific page — people respond to a concrete question far more than to "let me know what you think".
