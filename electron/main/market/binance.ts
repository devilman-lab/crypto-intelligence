import type { CryptoAsset, OHLCV, Ticker, Timeframe } from '@shared/types'
import { AppError, ErrorCodes } from '../errors'
import { fetchJson, num, RateLimiter } from './http'
import type { MarketDataProvider } from './provider'

const BASE = 'https://api.binance.com/api/v3'
/** Binance allows 1200 request-weight/min; a small spacing keeps bursts polite. */
const limiter = new RateLimiter(120)
const QUOTE = 'USDT'

interface BnTicker24h {
  symbol: string
  lastPrice?: string
  priceChangePercent?: string
  quoteVolume?: string
  highPrice?: string
  lowPrice?: string
  closeTime?: number
}

/**
 * Binance public market-data API (no key required). Primary source for
 * candles at every timeframe; can also serve tickers for USDT pairs
 * (no market-cap information — that comes from CoinGecko).
 */
export class BinanceProvider implements MarketDataProvider {
  readonly id = 'binance' as const
  readonly name = 'Binance'
  readonly supportedTimeframes: readonly Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1d', '1w']

  private symbols: Set<string> | null = null
  private symbolsFetchedAt = 0

  /** Set of tradeable USDT spot symbols (cached for 24h). */
  async getTradingSymbols(): Promise<Set<string>> {
    if (this.symbols && Date.now() - this.symbolsFetchedAt < 24 * 3600_000) return this.symbols
    const info = await fetchJson<{ symbols?: { symbol: string; quoteAsset: string; status: string; isSpotTradingAllowed?: boolean }[] }>(
      `${BASE}/exchangeInfo?permissions=SPOT`,
      limiter,
      { timeoutMs: 20_000 }
    )
    const set = new Set<string>()
    for (const s of info.symbols ?? []) {
      if (s.quoteAsset === QUOTE && s.status === 'TRADING') set.add(s.symbol)
    }
    if (set.size === 0) throw new AppError(ErrorCodes.PROVIDER, 'Binance returned no trading symbols.')
    this.symbols = set
    this.symbolsFetchedAt = Date.now()
    return set
  }

  async getAssets(): Promise<CryptoAsset[]> {
    const symbols = await this.getTradingSymbols()
    return [...symbols].map((s) => {
      const base = s.slice(0, -QUOTE.length)
      return { id: base.toLowerCase(), symbol: base, name: base, rank: null, imageUrl: null, binanceSymbol: s }
    })
  }

  async getTickers(): Promise<Ticker[]> {
    const symbols = await this.getTradingSymbols()
    const rows = await fetchJson<BnTicker24h[]>(`${BASE}/ticker/24hr`, limiter, { timeoutMs: 20_000 })
    if (!Array.isArray(rows)) throw new AppError(ErrorCodes.PROVIDER, 'Unexpected response from Binance.')
    const out: Ticker[] = []
    for (const r of rows) {
      if (!symbols.has(r.symbol)) continue
      const t = toTicker(r, { id: r.symbol.slice(0, -QUOTE.length).toLowerCase(), symbol: r.symbol.slice(0, -QUOTE.length), name: r.symbol.slice(0, -QUOTE.length), rank: null, imageUrl: null, binanceSymbol: r.symbol })
      if (t) out.push(t)
    }
    return out
  }

  async getTicker(asset: CryptoAsset): Promise<Ticker> {
    const symbol = asset.binanceSymbol
    if (!symbol) throw new AppError(ErrorCodes.NOT_FOUND, `${asset.symbol} is not listed on Binance.`)
    const r = await fetchJson<BnTicker24h>(`${BASE}/ticker/24hr?symbol=${symbol}`, limiter)
    const t = toTicker(r, asset)
    if (!t) throw new AppError(ErrorCodes.PROVIDER, 'Malformed ticker from Binance.')
    return t
  }

  async getOHLCV(asset: CryptoAsset, timeframe: Timeframe, limit: number): Promise<OHLCV[]> {
    const symbol = asset.binanceSymbol
    if (!symbol) throw new AppError(ErrorCodes.NOT_FOUND, `${asset.symbol} is not listed on Binance.`)
    const rows = await fetchJson<unknown[][]>(`${BASE}/klines?symbol=${symbol}&interval=${timeframe}&limit=${Math.min(1000, Math.max(1, limit))}`, limiter)
    if (!Array.isArray(rows)) throw new AppError(ErrorCodes.PROVIDER, 'Unexpected candle response from Binance.')
    const out: OHLCV[] = []
    for (const r of rows) {
      if (!Array.isArray(r) || r.length < 6) continue
      const t = num(r[0]), o = num(r[1]), h = num(r[2]), l = num(r[3]), c = num(r[4]), v = num(r[5])
      if (t == null || o == null || h == null || l == null || c == null || v == null) continue
      out.push({ time: Math.floor(t / 1000), open: o, high: h, low: l, close: c, volume: v })
    }
    return out
  }
}

function toTicker(r: BnTicker24h, asset: CryptoAsset): Ticker | null {
  const price = num(r.lastPrice)
  if (price === null || price <= 0) return null
  return {
    assetId: asset.id,
    symbol: asset.symbol,
    name: asset.name,
    rank: asset.rank,
    imageUrl: asset.imageUrl,
    price,
    change1hPct: null,
    change24hPct: num(r.priceChangePercent),
    change7dPct: null,
    change30dPct: null,
    marketCap: null,
    volume24h: num(r.quoteVolume),
    high24h: num(r.highPrice),
    low24h: num(r.lowPrice),
    circulatingSupply: null,
    ath: null,
    athDate: null,
    updatedAt: num(r.closeTime) ?? Date.now()
  }
}
