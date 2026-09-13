import type { CryptoAsset, OHLCV, Ticker, Timeframe } from '@shared/types'
import { AppError, ErrorCodes } from '../errors'
import { fetchJson, num, RateLimiter } from './http'
import type { MarketDataProvider } from './provider'
import { aggregateCandles } from './candles'

const BASE = 'https://api.coingecko.com/api/v3'
/** Public tier allows roughly 5–15 req/min; stay under that. */
const DEFAULT_MIN_INTERVAL_MS = 5000

interface CgMarket {
  id: string
  symbol: string
  name: string
  image?: string
  market_cap_rank?: number | null
  current_price?: number | null
  market_cap?: number | null
  total_volume?: number | null
  high_24h?: number | null
  low_24h?: number | null
  circulating_supply?: number | null
  ath?: number | null
  ath_date?: string | null
  last_updated?: string | null
  price_change_percentage_1h_in_currency?: number | null
  price_change_percentage_24h_in_currency?: number | null
  price_change_percentage_7d_in_currency?: number | null
  price_change_percentage_30d_in_currency?: number | null
  sparkline_in_7d?: { price?: unknown[] } | null
}

const MARKETS_QUERY = 'vs_currency=usd&order=market_cap_desc&sparkline=true&price_change_percentage=1h,24h,7d,30d'

/**
 * CoinGecko public API. Source of the asset universe (names, ranks, market
 * caps) and 24h tickers. Candle support is coarse on the free tier, so it is
 * only used as a fallback when an asset is not listed on Binance.
 */
export class CoinGeckoProvider implements MarketDataProvider {
  readonly id = 'coingecko' as const
  readonly name = 'CoinGecko'
  readonly supportedTimeframes: readonly Timeframe[] = ['4h', '1d', '1w']

  /** Hourly 7-day price sparklines captured from the last markets fetch (assetId -> prices). */
  private sparklines = new Map<string, number[]>()
  private readonly limiter: RateLimiter

  constructor(
    private readonly universeSize = 250,
    minIntervalMs = DEFAULT_MIN_INTERVAL_MS
  ) {
    this.limiter = new RateLimiter(minIntervalMs)
  }

  getSparkline(assetId: string): number[] | undefined {
    return this.sparklines.get(assetId)
  }

  async getAssets(): Promise<CryptoAsset[]> {
    return (await this.fetchMarkets()).map(toAsset)
  }

  async getTickers(): Promise<Ticker[]> {
    return (await this.fetchMarkets()).map(toTicker).filter((t): t is Ticker => t !== null)
  }

  async getTicker(asset: CryptoAsset): Promise<Ticker> {
    const rows = await fetchJson<CgMarket[]>(`${BASE}/coins/markets?${MARKETS_QUERY}&ids=${encodeURIComponent(asset.id)}`, this.limiter)
    const t = Array.isArray(rows) && rows[0] ? toTicker(rows[0]) : null
    if (!t) throw new AppError(ErrorCodes.NOT_FOUND, `No ticker for ${asset.symbol}.`)
    return t
  }

  async getOHLCV(asset: CryptoAsset, timeframe: Timeframe, limit: number): Promise<OHLCV[]> {
    if (timeframe === '4h') {
      const rows = await fetchJson<unknown[][]>(`${BASE}/coins/${encodeURIComponent(asset.id)}/ohlc?vs_currency=usd&days=30`, this.limiter)
      return parseOhlc(rows).slice(-limit)
    }
    // Daily / weekly: synthesise candles from the daily price series (free tier has no daily OHLC).
    const chart = await fetchJson<{ prices?: unknown[][]; total_volumes?: unknown[][] }>(
      `${BASE}/coins/${encodeURIComponent(asset.id)}/market_chart?vs_currency=usd&days=365`,
      this.limiter
    )
    const daily = synthesiseDaily(chart)
    return (timeframe === '1w' ? aggregateCandles(daily, '1d', '1w') : daily).slice(-limit)
  }

  private async fetchMarkets(): Promise<CgMarket[]> {
    const pages = Math.ceil(this.universeSize / 250)
    const out: CgMarket[] = []
    for (let page = 1; page <= pages; page++) {
      const rows = await fetchJson<CgMarket[]>(`${BASE}/coins/markets?${MARKETS_QUERY}&per_page=250&page=${page}`, this.limiter)
      if (!Array.isArray(rows)) throw new AppError(ErrorCodes.PROVIDER, 'Unexpected response from CoinGecko.')
      out.push(...rows.filter((r) => r && typeof r.id === 'string' && typeof r.symbol === 'string'))
    }
    const sliced = out.slice(0, this.universeSize)
    const sparks = new Map<string, number[]>()
    for (const m of sliced) {
      const raw = m.sparkline_in_7d?.price
      if (Array.isArray(raw) && raw.length >= 24) {
        const prices = raw.map(num).filter((p): p is number => p != null && p > 0)
        if (prices.length >= 24) sparks.set(m.id, prices)
      }
    }
    if (sparks.size) this.sparklines = sparks
    return sliced
  }
}

function toAsset(m: CgMarket): CryptoAsset {
  return {
    id: m.id,
    symbol: m.symbol.toUpperCase(),
    name: m.name ?? m.symbol.toUpperCase(),
    rank: num(m.market_cap_rank),
    imageUrl: typeof m.image === 'string' ? m.image : null,
    binanceSymbol: null
  }
}

function toTicker(m: CgMarket): Ticker | null {
  const price = num(m.current_price)
  if (price === null) return null
  const updated = m.last_updated ? Date.parse(m.last_updated) : NaN
  return {
    assetId: m.id,
    symbol: m.symbol.toUpperCase(),
    name: m.name ?? m.symbol.toUpperCase(),
    rank: num(m.market_cap_rank),
    imageUrl: typeof m.image === 'string' ? m.image : null,
    price,
    change1hPct: num(m.price_change_percentage_1h_in_currency),
    change24hPct: num(m.price_change_percentage_24h_in_currency),
    change7dPct: num(m.price_change_percentage_7d_in_currency),
    change30dPct: num(m.price_change_percentage_30d_in_currency),
    marketCap: num(m.market_cap),
    volume24h: num(m.total_volume),
    high24h: num(m.high_24h),
    low24h: num(m.low_24h),
    circulatingSupply: num(m.circulating_supply),
    ath: num(m.ath),
    athDate: m.ath_date ? Date.parse(m.ath_date) || null : null,
    updatedAt: Number.isFinite(updated) ? updated : Date.now()
  }
}

function parseOhlc(rows: unknown[][]): OHLCV[] {
  if (!Array.isArray(rows)) return []
  const out: OHLCV[] = []
  for (const r of rows) {
    if (!Array.isArray(r) || r.length < 5) continue
    const [t, o, h, l, c] = r.map(num)
    if (t == null || o == null || h == null || l == null || c == null) continue
    out.push({ time: Math.floor(t / 1000), open: o, high: h, low: l, close: c, volume: 0 })
  }
  return out
}

function synthesiseDaily(chart: { prices?: unknown[][]; total_volumes?: unknown[][] }): OHLCV[] {
  const prices = Array.isArray(chart.prices) ? chart.prices : []
  const volumes = new Map<number, number>()
  for (const v of Array.isArray(chart.total_volumes) ? chart.total_volumes : []) {
    if (Array.isArray(v)) {
      const t = num(v[0])
      const vol = num(v[1])
      if (t != null && vol != null) volumes.set(Math.floor(t / 86_400_000), vol)
    }
  }
  const out: OHLCV[] = []
  let prevClose: number | null = null
  for (const p of prices) {
    if (!Array.isArray(p)) continue
    const t = num(p[0])
    const close = num(p[1])
    if (t == null || close == null) continue
    const day = Math.floor(t / 86_400_000)
    const open = prevClose ?? close
    out.push({ time: day * 86_400, open, high: Math.max(open, close), low: Math.min(open, close), close, volume: (volumes.get(day) ?? 0) / close })
    prevClose = close
  }
  // market_chart may include a partial "today" point with the same day key; keep the last per day.
  const byDay = new Map<number, OHLCV>()
  for (const c of out) byDay.set(c.time, c)
  return [...byDay.values()].sort((a, b) => a.time - b.time)
}
