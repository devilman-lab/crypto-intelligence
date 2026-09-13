# Crypto Intelligence

**Crypto Market Analytics for Traders & Investors** — a local-first Windows desktop application for market monitoring, volatility analysis, technical analysis, screening, portfolio tracking, paper trading, a trading journal, alerts and historical event analysis.

> Crypto Intelligence is an analytical and educational software tool. It does not provide financial, investment, or trading advice. Market data and calculations may contain errors or delays. Past performance and historical observations do not guarantee future results. Users are solely responsible for their trading and investment decisions.

## Product overview

| Section | What it does |
| --- | --- |
| Dashboard | Portfolio value and P&L, BTC/ETH, market breadth, top gainers/losers, volume leaders, highest volatility, watchlist, active alerts, recent paper trades, allocation |
| Markets | Sortable, searchable table of the top 250 assets with 1h/24h/7d change, market cap, volume, 7-day volatility and daily RSI; star-to-watchlist; asset detail with candlestick chart (1m–1w) |
| Volatility | Ranking (24h / 7d / 30d annualised realised volatility, change, percentile, ATR%) and a market-cap-weighted heatmap |
| Screener | AND/OR conditions over 20 price, volume, volatility, momentum and trend fields; presets; saved screens |
| Technical Analysis | Chart with SMA/EMA/Bollinger/VWAP overlays and RSI/MACD/Stochastic/ATR panes; current readings table |
| Historical Analysis | "When X was true, what happened over the next N days?" — occurrences, mean/median return, positive share, extremes, distribution |
| Portfolio | Multiple portfolios, buy/sell/deposit/withdrawal transactions, weighted-average cost, unrealised/realised/daily P&L, allocation donut |
| Paper Trading | Virtual account with long and short simulation, fees, partial closes, win rate, profit factor, drawdown |
| Trading Journal | Entries with strategy, reasons, emotion, tags, screenshot path; filters; win rate, expectancy, profit factor, drawdown |
| Alerts | Price, 24h change, volatility, volume-vs-average and RSI alerts; once or repeating; desktop notifications; trigger history |
| Watchlist | Multiple named lists, add/remove/reorder |
| Settings | Theme, provider, refresh interval, display currency (USD/EUR/GBP/JPY), notifications, data location, backup/restore, CSV export, updates |

Everything works without an account, API keys or exchange credentials. All user data is stored locally in SQLite.

## Technology stack

- **Desktop:** Electron 44 (main / preload / renderer; `contextIsolation`, `sandbox`, no `nodeIntegration`)
- **UI:** React 19, TypeScript 5.9, Vite 7 via `electron-vite`, Tailwind CSS 4, Radix primitives, Lucide icons
- **Charts:** TradingView Lightweight Charts 5
- **State:** Zustand (one store per domain)
- **Database:** SQLite via `better-sqlite3` (Node-API prebuilds — no C++ toolchain required)
- **Validation:** zod at the IPC boundary and for backup imports
- **Tests / quality:** Vitest (107 tests), ESLint 9 + typescript-eslint + react-hooks, `tsc`
- **Packaging:** electron-builder (NSIS installer), electron-updater (GitHub Releases)
- **Website:** Next.js + TypeScript + Tailwind in `website/`

## Architecture

See [docs/architecture.md](docs/architecture.md). In short: the main process owns network, SQLite, alerts and scheduling; the preload exposes a fixed typed API; the renderer holds UI state and runs the shared, dependency-free analysis engine (`shared/analysis`) over data it already has.

```
electron/main/        main process: database, market providers, analytics, alerts, services, IPC handlers
electron/preload/     contextBridge API (the only surface the renderer can reach)
shared/               types, IPC contract and pure analysis code shared by all processes
src/                  React renderer: components, pages, stores, hooks, lib
tests/                vitest suites (indicators, volatility, screener, portfolio, paper, journal, alerts, history, providers, http, database, backup)
docs/                 architecture, market-data, indicators, database, security, release
resources/            icons and packaging assets
website/              marketing website (Next.js)
```

## Development setup

Requirements: Node.js ≥ 22 (developed on 24), npm ≥ 10, Windows 10/11. No Python or Visual Studio needed.

```bash
npm install
npm run dev        # hot-reloading Electron app
npm run typecheck  # tsc for main/preload/shared and renderer
npm run lint       # eslint
npm test           # vitest
npm run build      # production bundles into out/
npm run package    # Windows installer into release/<version>/
```

> If you run Electron from a terminal inside VS Code, unset `ELECTRON_RUN_AS_NODE` first (`env -u ELECTRON_RUN_AS_NODE npm run dev`), otherwise Electron starts as a plain Node process.

### Environment variables

The application needs none. Diagnostic variables recognised at launch:

| Variable | Effect |
| --- | --- |
| `CI_SCREENSHOT=<file.png>` | Capture the window after load and exit (`CI_SCREENSHOT_ROUTE`, `CI_SCREENSHOT_JS`, `CI_SCREENSHOT_SIZE=1280x720`, `CI_SCREENSHOT_DELAY` refine it) |
| `CI_OFFLINE=1` | Make every network request fail, to exercise offline mode |
| `NODE_ENV=development` | Debug-level console logging |

## Market-data providers

[docs/market-data.md](docs/market-data.md). CoinGecko supplies the universe, market caps and tickers; Binance's public API supplies candles for every timeframe. Both are wrapped by a `MarketDataProvider` interface behind `MarketService`, which caches everything in SQLite, respects rate limits, retries transient failures and falls back to cached data when offline.

## Indicators and volatility

[docs/indicators.md](docs/indicators.md) documents every formula (SMA, EMA, RSI, MACD, Bollinger, ATR, Stochastic, VWAP, realised volatility, percentile, ATR%). All are unit-tested against hand-computed values; RSI is verified against a published reference series.

## Database

[docs/database.md](docs/database.md) — schema migrations, repositories and the backup format.

## Security & privacy

[docs/security.md](docs/security.md). No secrets in the code base, no telemetry, no uploads. The renderer's CSP forbids network access entirely.

## Testing

```bash
npm test               # all suites
npx vitest run tests/indicators.test.ts
```

Suites cover: indicator maths, volatility maths, screener evaluation, portfolio accounting, paper-trading engine, journal statistics, alert evaluation, historical analysis, provider parsing (with fixtures), HTTP retry/rate-limit behaviour, every repository against a temporary SQLite file, and backup export/import.

## Building, packaging and releasing

[docs/release.md](docs/release.md). `npm run package` produces `release/<version>/Crypto-Intelligence-Setup-<version>.exe`. Keep `package.json` and `website/src/lib/release.ts` versions in sync.

## Website

```bash
cd website
npm install
npm run dev      # http://localhost:3000
npm run build    # static export
```

## Roadmap (out of MVP scope)

Optional AI module (`AIService` interface exists; `NullAIService` in MVP): market summaries, portfolio explanations, natural-language screener queries, journal analysis. Also: additional providers, exchange read-only sync, cloud backup — none of which are required for the current feature set.
