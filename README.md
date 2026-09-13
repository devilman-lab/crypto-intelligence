# Crypto Intelligence

**Crypto Market Analytics for Traders & Investors** — a local-first Windows desktop application for market monitoring, volatility analysis, technical analysis, screening, portfolio tracking, paper trading, a trading journal and alerts.

> Crypto Intelligence is an analytical and educational software tool. It does not provide financial, investment, or trading advice. Market data and calculations may contain errors or delays. Past performance and historical observations do not guarantee future results. Users are solely responsible for their trading and investment decisions.

## Status

Under active development, phase by phase. See `docs/` for architecture notes. This README is expanded as phases land.

| Phase | Scope | Status |
| --- | --- | --- |
| 1 | Foundation: Electron + React + TS + Vite + Tailwind, secure preload, SQLite, navigation shell | ✅ |
| 2 | Market data providers, caching, error handling | ⏳ |
| 3–14 | Dashboard, charts, volatility, screener, portfolio, paper trading, journal, alerts, history, backup, website, packaging | ⏳ |

## Technology stack

- **Desktop:** Electron 44 (main / preload / renderer, `contextIsolation`, `sandbox`, no `nodeIntegration`)
- **UI:** React 19, TypeScript 5.9, Vite 7 via `electron-vite`, Tailwind CSS 4, Radix primitives, Lucide icons
- **Charts:** TradingView Lightweight Charts 5
- **State:** Zustand (one store per domain)
- **Database:** SQLite via `better-sqlite3` (Node-API prebuilds — no C++ toolchain required)
- **Validation:** zod at the IPC boundary
- **Tests / quality:** Vitest, ESLint 9, `tsc`
- **Packaging:** electron-builder (NSIS installer)

## Development

```bash
npm install
npm run dev        # hot-reloading Electron app
npm run typecheck  # tsc for main/preload/shared and renderer
npm run lint       # eslint
npm test           # vitest
npm run build      # production bundles into out/
npm run package    # Windows installer into release/<version>/
```

> If you run Electron from a terminal inside VS Code, make sure `ELECTRON_RUN_AS_NODE` is not set (`env -u ELECTRON_RUN_AS_NODE npm run dev`), otherwise Electron starts as a plain Node process.

### Screenshot helper

`CI_SCREENSHOT=out.png [CI_SCREENSHOT_ROUTE=settings] npx electron .` launches the built app, captures the window and exits. Used for verification and website imagery.

## Project layout

```
electron/main/        main process: database, market providers, alerts, IPC handlers
electron/preload/     contextBridge API (the only surface the renderer can reach)
shared/               types, IPC contract and pure analysis code shared by all processes
src/                  React renderer: components, pages, stores, hooks, lib
tests/                vitest suites
docs/                 architecture and technical documentation
resources/            icons and packaging assets
```

## Data & privacy

All data (settings, watchlists, portfolios, journal, alerts, cached market data) is stored locally in a SQLite database under the user's application-data folder. No account is required and nothing is uploaded.
