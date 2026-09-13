# Architecture

Crypto Intelligence is a local-first Electron application. There is no backend: every feature works against public market-data APIs and a SQLite database on the user's machine.

```
┌──────────────────────────────── Electron main process ────────────────────────────────┐
│  main.ts (bootstrap)                                                                    │
│  ├─ database/        better-sqlite3 · migrations · repositories (settings, market cache,│
│  │                   watchlists, screens, portfolios, paper, journal, alerts)           │
│  ├─ market/          MarketService · CoinGeckoProvider · BinanceProvider · http (retry, │
│  │                   rate limit) · AnalyticsService (per-asset metrics)                 │
│  ├─ alerts/          AlertEngine (edge-triggered rules, desktop notifications)          │
│  ├─ services/        PaperTradingService · BackupService · UpdateService · AIService*   │
│  └─ ipc/             registry (zod-validated handlers) + one handler module per domain  │
└───────────────────────────────────────┬─────────────────────────────────────────────────┘
                                        │ contextBridge (preload/preload.ts): explicit, typed
┌───────────────────────────────────────▼───────────── Renderer (React) ─────────────────┐
│  lib/api.ts (typed client) → stores (zustand, one per domain) → pages → components      │
│  hooks/useIndicators, usePortfolioValuation … run the shared analysis engine in memo    │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                     shared/ (types, IPC contract, pure analysis engine) is imported by both
```

\* `AIService` is an interface with a `NullAIService`; the optional AI module is out of scope for the MVP.

## Processes and boundaries

| Layer | Responsibilities | Never does |
| --- | --- | --- |
| Main | Network, SQLite, notifications, dialogs, scheduling | Trust renderer input without validation |
| Preload | Expose a fixed set of typed functions on `window.api` | Expose Node, `ipcRenderer`, paths or the DB |
| Renderer | UI, derived calculations from data it already holds | Filesystem, network (CSP `connect-src 'self'`), SQL |

Every IPC channel is declared once in [shared/ipc.ts](../shared/ipc.ts) (`IpcInvokeContract`, `IpcEventContract`). Handlers register through `handle(channel, zodSchema, fn)` in [electron/main/ipc/registry.ts](../electron/main/ipc/registry.ts), which validates arguments, wraps results in `{ ok, data } | { ok, error }` and converts exceptions to `AppError` codes with user-safe messages. Push events (`market:tickers`, `analytics:snapshot`, `alerts:changed`, `connectivity:changed`, `settings:changed`, `data:restored`) go through `emit()`.

## Data flow

1. `MarketService.start()` loads the cached universe/tickers from SQLite, then refreshes tickers on a timer (settings-driven, ≥ 30 s). Each snapshot is persisted, pushed to the renderer and handed to the `AlertEngine`.
2. `AnalyticsService` walks the universe every 15 minutes computing `AssetMetrics` (volatility, RSI, %B, MA distance, volume ratio) from cached candles; results are pushed incrementally and persisted for offline start-up.
3. Renderer stores keep the latest snapshots; pages derive everything else (screener matches, portfolio valuation, paper P&L, journal stats) with `useMemo` over the pure functions in `shared/analysis`.
4. Mutations (watchlists, transactions, paper orders, journal, alerts, screens) go main-ward through IPC, are validated, written in SQLite transactions and echoed back.

## Shared analysis engine

`shared/analysis/*` contains no Electron, Node or DOM dependencies so it is used identically in the main process (alerts, analytics, history), the renderer (charts, screener, portfolio) and in tests:

- `indicators.ts` — SMA, EMA, RSI, MACD, Bollinger, ATR, Stochastic, VWAP
- `volatility.ts` — log returns, historical/rolling annualised volatility, percentile, snapshot
- `screener.ts` — condition model, evaluator, presets
- `portfolio.ts` — weighted-average cost accounting and valuation
- `paperTrading.ts` — long/short simulation and statistics
- `journal.ts` — P&L, filtering, statistics
- `alerts.ts` — edge-triggered rule evaluation
- `history.ts` — historical condition studies
- `classify.ts` — stablecoin heuristic

## Renderer structure

```
src/
  components/   ui primitives (Button, Panel, Dialog, Select, Switch, Tooltip, VirtualTable…),
                domain components (chart, market, portfolio, paper, journal, alerts, screener, settings)
  pages/        one component per sidebar section (+ AssetPage)
  stores/       zustand: ui (routing), settings, connectivity, market, analytics, watchlist,
                screens, portfolio, paper, journal, alerts, chart prefs
  hooks/        useOHLCV, useIndicators, usePortfolioValuation, useDebounce
  lib/          api client, formatting (with display-currency conversion), treemap, cn
```

Routing is a typed union in `uiStore` (`{ page }` or `{ page: 'asset', assetId }`) with a small history stack; no router library is needed for a desktop app.

## Performance notes

- Tables are virtualized (`@tanstack/react-virtual`); only visible rows exist in the DOM.
- Indicator series are computed once per candle array/config (`useIndicators`), the chart only calls `setData` on changes and is rebuilt only when the indicator set or theme changes.
- Metric computation for 250 assets runs in the main process, off the UI thread, throttled by provider rate limits.
- Renderer bundle is a single Vite build; the main and preload bundles externalize Node dependencies.
