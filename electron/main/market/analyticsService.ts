import type { AnalyticsSnapshot, AssetMetrics, CryptoAsset, OHLCV } from '@shared/types'
import { historicalVolatility, volatilitySnapshot } from '@shared/analysis/volatility'
import { bollinger, closes as toCloses, last, macd, rsi, sma } from '@shared/analysis/indicators'
import type { MarketCacheRepository } from '../database/repositories/marketCacheRepository'
import type { MarketService } from './marketService'
import { createLogger } from '../logger'
import { sleep } from './http'

const log = createLogger('analytics')

const CYCLE_MS = 15 * 60_000
const DAILY_LIMIT = 400
const HOURLY_LIMIT = 48
const PUSH_EVERY = 20
/** CoinGecko-only assets are slow (strict rate limit); fill them in gradually. */
const MAX_FALLBACK_PER_CYCLE = 6
const META_KEY = 'analytics_metrics'

/**
 * Background job that keeps a per-asset metrics table (volatility, RSI,
 * volume ratio, …) fresh for the whole universe. It walks the universe in
 * rank order, fetching daily (and, for Binance-listed assets, hourly)
 * candles through MarketService — which handles rate limits and caching —
 * and computes metrics with the shared analysis engine. Results are pushed
 * to the renderer incrementally and persisted for offline start-up.
 */
export class AnalyticsService {
  private metrics = new Map<string, AssetMetrics>()
  private updatedAt: number | null = null
  private progress = { done: 0, total: 0, running: false }
  private timer: NodeJS.Timeout | null = null
  private running = false
  private stopped = false

  constructor(
    private readonly market: MarketService,
    private readonly cache: MarketCacheRepository,
    private readonly onSnapshot: (s: AnalyticsSnapshot) => void
  ) {}

  start(): void {
    this.stopped = false
    const persisted = this.cache.getMetaJson<{ metrics: AssetMetrics[]; updatedAt: number }>(META_KEY)
    if (persisted) {
      this.metrics = new Map(persisted.metrics.map((m) => [m.assetId, m]))
      this.updatedAt = persisted.updatedAt
    }
    // Give the ticker refresh a head start so the universe exists.
    this.timer = setTimeout(() => void this.runCycle(), 5_000)
  }

  stop(): void {
    this.stopped = true
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
  }

  getSnapshot(): AnalyticsSnapshot {
    return { metrics: Object.fromEntries(this.metrics), updatedAt: this.updatedAt, progress: { ...this.progress } }
  }

  getMetrics(assetId: string): AssetMetrics | undefined {
    return this.metrics.get(assetId)
  }

  /** Runs one full pass; safe to call while another is running (it is skipped). */
  async runCycle(): Promise<void> {
    if (this.running) return
    this.running = true
    const all = this.market.listAssets()
    // Binance-listed assets are cheap; CoinGecko-only ones are processed last and only a few per cycle.
    const fast = all.filter((a) => a.binanceSymbol)
    const slow = all
      .filter((a) => !a.binanceSymbol)
      .filter((a) => {
        const m = this.metrics.get(a.id)
        return !m || Date.now() - m.computedAt > 24 * 3600_000
      })
      .slice(0, MAX_FALLBACK_PER_CYCLE)
    const assets = [...fast, ...slow]
    this.progress = { done: 0, total: assets.length, running: true }
    // Cheap first pass: sparkline-derived 24h/7d volatility for every asset lacking daily metrics.
    let sparkCount = 0
    for (const asset of all) {
      const existing = this.metrics.get(asset.id)
      if (existing?.source === 'daily' && Date.now() - existing.computedAt < 24 * 3600_000) continue
      const spark = this.market.getSparkline(asset.id)
      if (!spark) continue
      this.metrics.set(asset.id, sparklineMetrics(asset, spark))
      sparkCount++
    }
    if (sparkCount) this.onSnapshot(this.getSnapshot())
    log.info(`metrics cycle start: ${fast.length} binance + ${slow.length} fallback assets`)
    const started = Date.now()
    let failures = 0
    try {
      for (const asset of assets) {
        if (this.stopped) break
        try {
          const m = await this.computeAsset(asset)
          if (m) this.metrics.set(asset.id, m)
        } catch (err) {
          failures++
          log.debug(`metrics failed for ${asset.symbol}: ${err instanceof Error ? err.message : String(err)}`)
          // Back off briefly if the provider is unhappy, so we never hammer it.
          await sleep(1_000)
        }
        this.progress.done++
        if (this.progress.done % PUSH_EVERY === 0) this.onSnapshot(this.getSnapshot())
      }
      this.updatedAt = Date.now()
      this.cache.setMetaJson(META_KEY, { metrics: [...this.metrics.values()], updatedAt: this.updatedAt })
      log.info(`metrics cycle done: ${this.metrics.size} assets, ${failures} failures, ${Math.round((Date.now() - started) / 1000)}s`)
    } finally {
      this.running = false
      this.progress.running = false
      this.onSnapshot(this.getSnapshot())
      if (!this.stopped) this.timer = setTimeout(() => void this.runCycle(), CYCLE_MS)
    }
  }

  private async computeAsset(asset: CryptoAsset): Promise<AssetMetrics | null> {
    const onBinance = !!asset.binanceSymbol
    const daily = (await this.market.getOHLCV(asset.id, '1d', DAILY_LIMIT)).candles
    if (daily.length < 15) return null
    let hourly: OHLCV[] | undefined
    if (onBinance) {
      try {
        hourly = (await this.market.getOHLCV(asset.id, '1h', HOURLY_LIMIT)).candles
      } catch {
        hourly = undefined
      }
    }
    return computeMetrics(asset, daily, hourly, this.market.getSnapshot().tickers.find((t) => t.assetId === asset.id)?.volume24h ?? null)
  }
}

/** Pure metric computation (exported for tests). */
export function computeMetrics(asset: Pick<CryptoAsset, 'id' | 'symbol'>, daily: OHLCV[], hourly: OHLCV[] | undefined, volume24hUsd: number | null): AssetMetrics {
  const vol = volatilitySnapshot(daily, hourly)
  const c = toCloses(daily)
  const price = c[c.length - 1] ?? null
  const bb = bollinger(c, 20, 2)
  const up = last(bb.upper)
  const lo = last(bb.lower)
  const s50 = last(sma(c, 50))
  const s200 = last(sma(c, 200))
  // Volume ratio must compare like with like. Binance-listed assets: last 24 hourly candles vs the
  // trailing 30 complete Binance daily candles. Others: the provider's global 24h volume vs its own
  // daily series (both CoinGecko). Mixing global and single-exchange volumes would inflate the ratio.
  const hist = daily.slice(0, -1).slice(-30)
  const avgVol = hist.length >= 5 ? hist.reduce((s, k) => s + k.volume * k.close, 0) / hist.length : null
  const last24 = hourly && hourly.length >= 24 ? hourly.slice(-24).reduce((s, k) => s + k.volume * k.close, 0) : null
  const vol24 = hourly ? last24 : volume24hUsd
  return {
    assetId: asset.id,
    symbol: asset.symbol,
    vol24h: vol.vol24h,
    vol7d: vol.vol7d,
    vol30d: vol.vol30d,
    volPercentile: vol.percentile,
    volChange: vol.change,
    atrPct: vol.atrPct,
    rsi14: last(rsi(c, 14)),
    bbPercentB: up != null && lo != null && price != null && up !== lo ? (price - lo) / (up - lo) : null,
    vsSma50Pct: s50 && price != null ? (price / s50 - 1) * 100 : null,
    vsSma200Pct: s200 && price != null ? (price / s200 - 1) * 100 : null,
    macdHist: last(macd(c, 12, 26, 9).histogram),
    volumeRatio: vol24 != null && avgVol ? vol24 / avgVol : null,
    history: daily.length,
    source: 'daily',
    computedAt: Date.now()
  }
}

/** Metrics derivable from 7 days of hourly prices only (CoinGecko sparkline). */
export function sparklineMetrics(asset: Pick<CryptoAsset, 'id' | 'symbol'>, hourlyPrices: readonly number[]): AssetMetrics {
  return {
    assetId: asset.id,
    symbol: asset.symbol,
    vol24h: historicalVolatility(hourlyPrices.slice(-25), 24, '1h'),
    vol7d: historicalVolatility(hourlyPrices, Math.min(hourlyPrices.length - 1, 167), '1h'),
    vol30d: null,
    volPercentile: null,
    volChange: null,
    atrPct: null,
    rsi14: null,
    bbPercentB: null,
    vsSma50Pct: null,
    vsSma200Pct: null,
    macdHist: null,
    volumeRatio: null,
    history: 0,
    source: 'sparkline',
    computedAt: Date.now()
  }
}
