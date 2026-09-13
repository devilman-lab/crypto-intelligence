/**
 * Schema migrations, applied in order. Each migration runs once inside a
 * transaction and its version is recorded in `schema_migrations`.
 * Never edit a migration after it has shipped; add a new one instead.
 */
export interface Migration {
  version: number
  name: string
  up: string
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_settings',
    up: `
      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `
  },
  {
    version: 2,
    name: 'market_cache',
    up: `
      CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY NOT NULL,
        symbol TEXT NOT NULL,
        name TEXT NOT NULL,
        rank INTEGER,
        image_url TEXT,
        binance_symbol TEXT,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_assets_symbol ON assets(symbol);
      CREATE INDEX IF NOT EXISTS idx_assets_rank ON assets(rank);

      CREATE TABLE IF NOT EXISTS tickers (
        asset_id TEXT PRIMARY KEY NOT NULL,
        data TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS ohlcv (
        asset_id TEXT NOT NULL,
        timeframe TEXT NOT NULL,
        time INTEGER NOT NULL,
        open REAL NOT NULL,
        high REAL NOT NULL,
        low REAL NOT NULL,
        close REAL NOT NULL,
        volume REAL NOT NULL,
        PRIMARY KEY (asset_id, timeframe, time)
      );

      CREATE TABLE IF NOT EXISTS cache_meta (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `
  },
  {
    version: 3,
    name: 'watchlists',
    up: `
      CREATE TABLE IF NOT EXISTS watchlists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS watchlist_items (
        watchlist_id INTEGER NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
        asset_id TEXT NOT NULL,
        symbol TEXT NOT NULL,
        position INTEGER NOT NULL,
        added_at INTEGER NOT NULL,
        PRIMARY KEY (watchlist_id, asset_id)
      );
    `
  },
  {
    version: 4,
    name: 'screens',
    up: `
      CREATE TABLE IF NOT EXISTS screens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        definition TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `
  },
  {
    version: 5,
    name: 'portfolios',
    up: `
      CREATE TABLE IF NOT EXISTS portfolios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        portfolio_id INTEGER NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
        asset_id TEXT NOT NULL,
        symbol TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('buy','sell','deposit','withdrawal')),
        quantity REAL NOT NULL CHECK (quantity >= 0),
        price REAL NOT NULL CHECK (price >= 0),
        fee REAL NOT NULL DEFAULT 0 CHECK (fee >= 0),
        timestamp INTEGER NOT NULL,
        notes TEXT NOT NULL DEFAULT ''
      );
      CREATE INDEX IF NOT EXISTS idx_transactions_portfolio ON transactions(portfolio_id, timestamp);
    `
  },
  {
    version: 6,
    name: 'paper_trading',
    up: `
      CREATE TABLE IF NOT EXISTS paper_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        starting_balance REAL NOT NULL,
        cash REAL NOT NULL,
        fee_rate REAL NOT NULL DEFAULT 0.001,
        created_at INTEGER NOT NULL,
        reset_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS paper_positions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL REFERENCES paper_accounts(id) ON DELETE CASCADE,
        asset_id TEXT NOT NULL,
        symbol TEXT NOT NULL,
        side TEXT NOT NULL CHECK (side IN ('long','short')),
        quantity REAL NOT NULL,
        entry_price REAL NOT NULL,
        entry_fees REAL NOT NULL DEFAULT 0,
        opened_at INTEGER NOT NULL,
        UNIQUE (account_id, asset_id, side)
      );
      CREATE TABLE IF NOT EXISTS paper_trades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL REFERENCES paper_accounts(id) ON DELETE CASCADE,
        asset_id TEXT NOT NULL,
        symbol TEXT NOT NULL,
        side TEXT NOT NULL,
        quantity REAL NOT NULL,
        entry_price REAL NOT NULL,
        exit_price REAL NOT NULL,
        fees REAL NOT NULL,
        pnl REAL NOT NULL,
        roi_pct REAL NOT NULL,
        opened_at INTEGER NOT NULL,
        closed_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_paper_trades_account ON paper_trades(account_id, closed_at);
    `
  },
  {
    version: 7,
    name: 'journal',
    up: `
      CREATE TABLE IF NOT EXISTS journal_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_id TEXT NOT NULL,
        symbol TEXT NOT NULL,
        side TEXT NOT NULL CHECK (side IN ('long','short')),
        entry_price REAL NOT NULL,
        exit_price REAL,
        quantity REAL NOT NULL,
        fees REAL NOT NULL DEFAULT 0,
        strategy TEXT NOT NULL DEFAULT '',
        entry_reason TEXT NOT NULL DEFAULT '',
        exit_reason TEXT NOT NULL DEFAULT '',
        result TEXT NOT NULL,
        emotion TEXT NOT NULL DEFAULT 'neutral',
        notes TEXT NOT NULL DEFAULT '',
        screenshot_path TEXT NOT NULL DEFAULT '',
        tags TEXT NOT NULL DEFAULT '[]',
        opened_at INTEGER NOT NULL,
        closed_at INTEGER,
        pnl REAL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_journal_opened ON journal_entries(opened_at);
      CREATE INDEX IF NOT EXISTS idx_journal_asset ON journal_entries(asset_id);
    `
  },
  {
    version: 8,
    name: 'alerts',
    up: `
      CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_id TEXT NOT NULL,
        symbol TEXT NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('price','change24h','volatility','volume','rsi')),
        direction TEXT NOT NULL CHECK (direction IN ('above','below')),
        threshold REAL NOT NULL,
        mode TEXT NOT NULL CHECK (mode IN ('once','repeating')),
        enabled INTEGER NOT NULL DEFAULT 1,
        armed INTEGER NOT NULL DEFAULT 0,
        last_triggered_at INTEGER,
        trigger_count INTEGER NOT NULL DEFAULT 0,
        note TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS alert_triggers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        alert_id INTEGER NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
        symbol TEXT NOT NULL,
        kind TEXT NOT NULL,
        message TEXT NOT NULL,
        value REAL NOT NULL,
        triggered_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_alert_triggers_time ON alert_triggers(triggered_at);
    `
  }
]
