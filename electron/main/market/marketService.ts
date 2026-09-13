import type { AppSettings, ConnectivityStatus, CryptoAsset, MarketDataProviderId, OHLCV, OHLCVResult, Ticker, TickerSnapshot, Timeframe, VolumeData } from '@shared/types'
import { TIMEFRAME_SECONDS } from '@shared/types'
import type { MarketCacheRepository } from '../database/repositories/marketCacheRepository'
import { AppError, ErrorCodes } from '../errors'
import { createLogger } from '../logger'
import { BinanceProvider } from './binance'
import { sanitizeCandles } from './candles'
import { CoinGeckoProvider } from './coingecko'
import type { MarketDataProvider } from './provider'

const log = createLogger('market')
const UNIVERSE_TTL_MS = 24 * 3600_000
const MIN_REFRESH_MS = 30_000
const FX_TTL_MS = 30 * 60_000

export interface MarketEvents {
  onTickers: (snapshot: TickerSnapshot) => void
  onConnectivity: (status: ConnectivityStatus) => void
}

/**
 * Orchestrates providers, caching and refresh scheduling. The renderer only
 * ever talks to this service (through IPC) and never to a provider directly.
 *
 * - Universe (names, ranks, market caps): CoinGecko, refreshed daily.
 * - Tickers: the provider selected in settings, on a timer.
 * - Candles: Binance when the pair exists (all timeframes), CoinGecko otherwise
 *   (coarse). Everything is cached in SQLite for offline mode.
 */
export class MarketService {
  private readonly coingecko = new CoinGeckoProvider()
  private readonly binance = new BinanceProvider()
  private providerId: MarketDataProviderId = 'coingecko'
  private refreshMs = 60_000
  private timer: NodeJS.Timeout | null = null
  private refreshing: Promise<TickerSnapshot> | null = null

  private assets = new Map<string, CryptoAsset>()
  private assetsBySymbol = new Map<string, CryptoAsset>()
  private assetsUpdatedAt: number | null = null
  private snapshot: TickerSnapshot = { tickers: [], fxRates: { USD: 1 }, updatedAt: null, stale: true, provider: 'coingecko' }
  private fxRates: Record<string, number> = { USD: 1 }
  private fxFetchedAt = 0
  /** Per asset/timeframe: when candles were last fetched and how many were requested. */
  private candleFetches = new Map<string, { at: number; limit: number }>()
  private status: ConnectivityStatus = { online: true, lastMarketUpdateAt: null }

  constructor(
    private readonly cache: MarketCacheRepository,
    private readonly events: MarketEvents
  ) {}

  // ---------- lifecycle ----------

  async start(settings: AppSettings): Promise<void> {
    this.applySettings(settings, false)
    const cachedAssets = this.cache.loadAssets()
    this.setAssets(cachedAssets.assets, cachedAssets.updatedAt)
    const cachedTickers = this.cache.loadTickers()
    if (cachedTickers.tickers.length) {
      this.fxRates = this.cache.getMetaJson<Record<string, number>>('fx_rates') ?? { USD: 1 }
      this.snapshot = { tickers: cachedTickers.tickers, fxRates: this.fxRates, updatedAt: cachedTickers.updatedAt, stale: true, provider: cachedTickers.provider ?? 'cache' }
      this.status = { ...this.status, lastMarketUpdateAt: cachedTickers.updatedAt }
    }
    void this.refreshTickers().catch(() => undefined)
    this.schedule()
  }

  stop(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
  }

  applySettings(settings: AppSettings, restart = true): void {
    const providerChanged = settings.marketDataProvider !== this.providerId
    this.providerId = settings.marketDataProvider
    this.refreshMs = Math.max(MIN_REFRESH_MS, settings.refreshIntervalSec * 1000)
    if (restart) {
      this.schedule()
      if (providerChanged) void this.refreshTickers().catch(() => undefined)
    }
  }

  private schedule(): void {
    this.stop()
    this.timer = setTimeout(() => {
      void this.refreshTickers().catch(() => undefined).finally(() => this.schedule())
    }, this.refreshMs)
  }

  // ---------- universe ----------

  private setAssets(assets: CryptoAsset[], updatedAt: number | null): void {
    this.assets = new Map(assets.map((a) => [a.id, a]))
    this.assetsBySymbol = new Map()
    for (const a of [...assets].reverse()) this.assetsBySymbol.set(a.symbol, a) // lower rank wins
    this.assetsUpdatedAt = updatedAt
  }

  private async ensureUniverse(): Promise<void> {
    if (this.assets.size && this.assetsUpdatedAt && Date.now() - this.assetsUpdatedAt < UNIVERSE_TTL_MS) return
    const assets = await this.coingecko.getAssets()
    let binanceSymbols: Set<string> | null = null
    try {
      binanceSymbols = await this.binance.getTradingSymbols()
    } catch (err) {
      log.warn('could not load Binance symbols; candles will use CoinGecko fallback', err)
    }
    for (const a of assets) {
      const candidate = `${a.symbol}USDT`
      a.binanceSymbol = binanceSymbols?.has(candidate) ? candidate : (this.assets.get(a.id)?.binanceSymbol ?? null)
    }
    this.cache.saveAssets(assets)
    this.setAssets(assets, Date.now())
    log.info(`universe loaded: ${assets.length} assets`)
  }

  /** Hourly prices for the last 7 days from CoinGecko (cheap volatility fallback). */
  getSparkline(assetId: string): number[] | undefined {
    return this.coingecko.getSparkline(assetId)
  }

  getAsset(assetId: string): CryptoAsset | undefined {
    return this.assets.get(assetId)
  }

  listAssets(): CryptoAsset[] {
    return [...this.assets.values()]
  }

  searchAssets(query: string, limit = 20): CryptoAsset[] {
    const q = query.trim().toLowerCase()
    if (!q) return this.listAssets().slice(0, limit)
    const out: CryptoAsset[] = []
    for (const a of this.assets.values()) {
      if (a.symbol.toLowerCase().startsWith(q) || a.name.toLowerCase().includes(q) || a.id.includes(q)) out.push(a)
      if (out.length >= limit) break
    }
    return out
  }

  // ---------- tickers ----------

  getSnapshot(): TickerSnapshot {
    return this.snapshot
  }

  getStatus(): ConnectivityStatus {
    return this.status
  }

  /** Fetches fresh tickers; coalesces concurrent calls. Never throws to the scheduler. */
  refreshTickers(): Promise<TickerSnapshot> {
    if (this.refreshing) return this.refreshing
    this.refreshing = this.doRefresh().finally(() => (this.refreshing = null))
    return this.refreshing
  }

  private async doRefresh(): Promise<TickerSnapshot> {
    try {
      await this.ensureUniverse()
      const provider = this.provider()
      const raw = await provider.getTickers()
      const tickers = this.mergeIntoUniverse(raw, provider.id)
      await this.refreshFx()
      this.snapshot = { tickers, fxRates: this.fxRates, updatedAt: Date.now(), stale: false, provider: provider.id }
      this.cache.saveTickers(tickers, provider.id)
      this.setStatus({ online: true, lastMarketUpdateAt: this.snapshot.updatedAt })
      this.events.onTickers(this.snapshot)
      log.debug(`tickers refreshed via ${provider.id}: ${tickers.length}`)
      return this.snapshot
    } catch (err) {
      const e = err instanceof AppError ? err : new AppError(ErrorCodes.NETWORK, 'Market data unavailable.', { cause: err })
      log.warn(`ticker refresh failed [${e.code}]: ${e.message}`)
      this.snapshot = { ...this.snapshot, stale: true }
      const offline = e.code === ErrorCodes.NETWORK || e.code === ErrorCodes.TIMEOUT
      this.setStatus({ online: !offline, degraded: !offline, lastMarketUpdateAt: this.status.lastMarketUpdateAt, reason: e.message })
      this.events.onTickers(this.snapshot)
      throw e
    }
  }

  private async refreshFx(): Promise<void> {
    if (Date.now() - this.fxFetchedAt < FX_TTL_MS) return
    try {
      this.fxRates = await this.coingecko.getFxRates()
      this.fxFetchedAt = Date.now()
      this.cache.setMetaJson('fx_rates', this.fxRates)
    } catch (err) {
      log.debug(`fx refresh failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  /**
   * Maps provider tickers onto the canonical universe. Binance tickers carry
   * no market cap/rank, so those fields are retained from the last snapshot.
   */
  private mergeIntoUniverse(raw: Ticker[], providerId: MarketDataProviderId): Ticker[] {
    const previous = new Map(this.snapshot.tickers.map((t) => [t.assetId, t]))
    const out: Ticker[] = []
    if (providerId === 'coingecko') {
      for (const t of raw) if (this.assets.has(t.assetId)) out.push(t)
    } else {
      for (const t of raw) {
        const asset = this.assetsBySymbol.get(t.symbol)
        if (!asset || asset.binanceSymbol !== `${t.symbol}USDT`) continue
        const prev = previous.get(asset.id)
        out.push({
          ...t,
          assetId: asset.id,
          name: asset.name,
          rank: asset.rank,
          imageUrl: asset.imageUrl,
          change7dPct: prev?.change7dPct ?? null,
          change30dPct: prev?.change30dPct ?? null,
          marketCap: prev?.marketCap ?? null,
          circulatingSupply: prev?.circulatingSupply ?? null,
          ath: prev?.ath ?? null,
          athDate: prev?.athDate ?? null
        })
      }
    }
    out.sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9))
    return out
  }

  private provider(): MarketDataProvider {
    return this.providerId === 'binance' ? this.binance : this.coingecko
  }

  private setStatus(status: ConnectivityStatus): void {
    const changed = status.online !== this.status.online || !!status.degraded !== !!this.status.degraded || status.lastMarketUpdateAt !== this.status.lastMarketUpdateAt || status.reason !== this.status.reason
    this.status = status
    if (changed) this.events.onConnectivity(status)
  }

  // ---------- candles ----------

  async getOHLCV(assetId: string, timeframe: Timeframe, limit = 500): Promise<OHLCVResult> {
    const asset = this.assets.get(assetId)
    if (!asset) throw new AppError(ErrorCodes.NOT_FOUND, 'Unknown asset.')
    const key = `${assetId}:${timeframe}`
    const last = this.candleFetches.get(key)
    const fetchedAt = last?.at ?? 0
    // Refresh at most once per candle interval, but at least every 60s for intraday charts.
    // A request for more candles than previously fetched always goes to the provider.
    const ttl = Math.min(TIMEFRAME_SECONDS[timeframe] * 1000, 60_000)
    const cached = this.cache.loadCandles(assetId, timeframe, limit)
    if (cached.length >= Math.min(limit, 50) && Date.now() - fetchedAt < ttl && (last?.limit ?? 0) >= limit) {
      return { assetId, timeframe, candles: cached, source: 'cache', updatedAt: fetchedAt, stale: false }
    }

    const provider = asset.binanceSymbol ? this.binance : this.coingecko
    if (!provider.supportedTimeframes.includes(timeframe)) {
      if (cached.length) return { assetId, timeframe, candles: cached, source: 'cache', updatedAt: fetchedAt || null, stale: true }
      throw new AppError(ErrorCodes.PROVIDER, `${timeframe} candles are not available for ${asset.symbol}.`)
    }
    try {
      const candles = sanitizeCandles(await provider.getOHLCV(asset, timeframe, limit))
      if (!candles.length) throw new AppError(ErrorCodes.PROVIDER, 'No candle data returned.')
      this.cache.saveCandles(assetId, timeframe, candles)
      const now = Date.now()
      this.candleFetches.set(key, { at: now, limit })
      this.setStatus({ online: true, lastMarketUpdateAt: now })
      return { assetId, timeframe, candles: this.cache.loadCandles(assetId, timeframe, limit), source: provider.id, updatedAt: now, stale: false }
    } catch (err) {
      const e = err instanceof AppError ? err : new AppError(ErrorCodes.NETWORK, 'Market data unavailable.', { cause: err })
      log.warn(`candles ${key} failed [${e.code}]: ${e.message}`)
      if (cached.length) return { assetId, timeframe, candles: cached, source: 'cache', updatedAt: fetchedAt || null, stale: true }
      throw e
    }
  }

  /** Volume relative to the trailing 30-day average (from daily candles). */
  async getVolume(assetId: string): Promise<VolumeData> {
    const ticker = this.snapshot.tickers.find((t) => t.assetId === assetId)
    let averageVolume: number | null = null
    try {
      const { candles } = await this.getOHLCV(assetId, '1d', 31)
      const history: OHLCV[] = candles.slice(0, -1).slice(-30)
      if (history.length >= 5) averageVolume = history.reduce((s, c) => s + c.volume * c.close, 0) / history.length
    } catch {
      /* fall through with null average */
    }
    const volume24h = ticker?.volume24h ?? null
    return { assetId, volume24h, averageVolume, windowDays: 30, ratio: volume24h != null && averageVolume ? volume24h / averageVolume : null }
  }
}
