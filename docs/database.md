# Database

SQLite via `better-sqlite3` (Node-API prebuilds, WAL mode, foreign keys on). The file lives at `%APPDATA%\Crypto Intelligence\crypto-intelligence.db` (shown in Settings → Database). Only the main process opens it; the renderer never receives a connection or raw SQL.

## Migrations

[electron/main/database/migrations/index.ts](../electron/main/database/migrations/index.ts) is an ordered list of `{ version, name, up }`. `openDatabase()` applies pending versions inside a transaction and records them in `schema_migrations`. Shipped migrations are never edited; add a new version instead.

| Version | Tables |
| --- | --- |
| 1 | `settings` (single JSON document under key `app`) |
| 2 | `assets`, `tickers`, `ohlcv`, `cache_meta` — market cache |
| 3 | `watchlists`, `watchlist_items` |
| 4 | `screens` (saved screener definitions as JSON) |
| 5 | `portfolios`, `transactions` |
| 6 | `paper_accounts`, `paper_positions`, `paper_trades` |
| 7 | `journal_entries` |
| 8 | `alerts`, `alert_triggers` |

Foreign keys cascade (`ON DELETE CASCADE`) from portfolios → transactions, paper accounts → positions/trades, alerts → triggers, watchlists → items.

## Repositories

One class per domain under `electron/main/database/repositories/`. They own prepared statements and return plain, serialisable objects typed by `shared/types`. Business rules stay in services/engines; repositories only persist:

- `SettingsRepository` — get/update merged with defaults; tolerant of corrupt JSON.
- `MarketCacheRepository` — universe, last tickers, candles (trimmed to 2000 per asset/timeframe), JSON metadata (metrics, FX rates).
- `WatchlistRepository`, `ScreenRepository`, `PortfolioRepository`, `PaperRepository`, `JournalRepository`, `AlertRepository`.

Derived values (holdings, P&L, journal result/pnl) are computed by the shared engine; the journal stores `pnl`/`result` denormalised for filtering.

## Backup format

`BackupService` exports a JSON document (`app: "crypto-intelligence"`, `schemaVersion: 1`) containing every user table above, excluding market caches. Imports are validated with zod (limits on sizes and enums), previewed, and applied in a single transaction in either **merge** or **replace** mode. Ids inside the file are remapped on import.

## Privacy

All user data stays in this file. No table is ever transmitted; the only outbound requests are the public market-data calls documented in [market-data.md](market-data.md).
