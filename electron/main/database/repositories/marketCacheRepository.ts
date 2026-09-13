import type { AppDatabase } from '../database'
import type { CryptoAsset, OHLCV, Ticker, Timeframe } from '@shared/types'

interface AssetRow {
  id: string
  symbol: string
  name: string
  rank: number | null
  image_url: string | null
  binance_symbol: string | null
}

/** Persistent cache of the asset universe, last tickers and candles (offline mode). */
export class MarketCacheRepository {
  private readonly upsertAsset
  private readonly selectAssets
  private readonly upsertTicker
  private readonly selectTickers
  private readonly upsertCandle
  private readonly selectCandles
  private readonly deleteOldCandles
  private readonly getMeta
  private readonly setMeta

  constructor(private readonly db: AppDatabase) {
    this.upsertAsset = db.prepare(
      `INSERT INTO assets (id, symbol, name, rank, image_url, binance_symbol, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET symbol = excluded.symbol, name = excluded.name, rank = excluded.rank,
         image_url = excluded.image_url, binance_symbol = excluded.binance_symbol, updated_at = excluded.updated_at`
    )
    this.selectAssets = db.prepare('SELECT id, symbol, name, rank, image_url, binance_symbol FROM assets ORDER BY rank IS NULL, rank ASC')
    this.upsertTicker = db.prepare(
      `INSERT INTO tickers (asset_id, data, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(asset_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`
    )
    this.selectTickers = db.prepare('SELECT data FROM tickers')
    this.upsertCandle = db.prepare(
      `INSERT INTO ohlcv (asset_id, timeframe, time, open, high, low, close, volume) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(asset_id, timeframe, time) DO UPDATE SET open = excluded.open, high = excluded.high, low = excluded.low,
         close = excluded.close, volume = excluded.volume`
    )
    this.selectCandles = db.prepare(
      'SELECT time, open, high, low, close, volume FROM ohlcv WHERE asset_id = ? AND timeframe = ? ORDER BY time DESC LIMIT ?'
    )
    this.deleteOldCandles = db.prepare(
      `DELETE FROM ohlcv WHERE asset_id = ? AND timeframe = ? AND time < (
         SELECT MIN(time) FROM (SELECT time FROM ohlcv WHERE asset_id = ? AND timeframe = ? ORDER BY time DESC LIMIT ?))`
    )
    this.getMeta = db.prepare('SELECT value, updated_at FROM cache_meta WHERE key = ?')
    this.setMeta = db.prepare(
      `INSERT INTO cache_meta (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    )
  }

  saveAssets(assets: CryptoAsset[]): void {
    const now = Date.now()
    this.db.transaction(() => {
      for (const a of assets) this.upsertAsset.run(a.id, a.symbol, a.name, a.rank, a.imageUrl, a.binanceSymbol, now)
    })()
    this.setMeta.run('assets_updated_at', String(now), now)
  }

  loadAssets(): { assets: CryptoAsset[]; updatedAt: number | null } {
    const rows = this.selectAssets.all() as AssetRow[]
    const meta = this.getMeta.get('assets_updated_at') as { value: string } | undefined
    return {
      assets: rows.map((r) => ({ id: r.id, symbol: r.symbol, name: r.name, rank: r.rank, imageUrl: r.image_url, binanceSymbol: r.binance_symbol })),
      updatedAt: meta ? Number(meta.value) : null
    }
  }

  saveTickers(tickers: Ticker[], provider: string): void {
    const now = Date.now()
    this.db.transaction(() => {
      for (const t of tickers) this.upsertTicker.run(t.assetId, JSON.stringify(t), now)
    })()
    this.setMeta.run('tickers_updated_at', String(now), now)
    this.setMeta.run('tickers_provider', provider, now)
  }

  loadTickers(): { tickers: Ticker[]; updatedAt: number | null; provider: string | null } {
    const rows = this.selectTickers.all() as { data: string }[]
    const tickers: Ticker[] = []
    for (const r of rows) {
      try {
        tickers.push(JSON.parse(r.data) as Ticker)
      } catch {
        /* skip corrupt row */
      }
    }
    const updated = this.getMeta.get('tickers_updated_at') as { value: string } | undefined
    const provider = this.getMeta.get('tickers_provider') as { value: string } | undefined
    return { tickers, updatedAt: updated ? Number(updated.value) : null, provider: provider?.value ?? null }
  }

  saveCandles(assetId: string, timeframe: Timeframe, candles: OHLCV[], keep = 2000): void {
    this.db.transaction(() => {
      for (const c of candles) this.upsertCandle.run(assetId, timeframe, c.time, c.open, c.high, c.low, c.close, c.volume)
      this.deleteOldCandles.run(assetId, timeframe, assetId, timeframe, keep)
    })()
  }

  getMetaJson<T>(key: string): T | null {
    const row = this.getMeta.get(key) as { value: string } | undefined
    if (!row) return null
    try {
      return JSON.parse(row.value) as T
    } catch {
      return null
    }
  }

  setMetaJson(key: string, value: unknown): void {
    this.setMeta.run(key, JSON.stringify(value), Date.now())
  }

  loadCandles(assetId: string, timeframe: Timeframe, limit: number): OHLCV[] {
    const rows = this.selectCandles.all(assetId, timeframe, limit) as OHLCV[]
    return rows.reverse()
  }
}
