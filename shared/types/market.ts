export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w'
export const TIMEFRAMES: readonly Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1d', '1w']

/** Seconds per candle for each timeframe. */
export const TIMEFRAME_SECONDS: Record<Timeframe, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
  '1w': 604800
}

/**
 * A tradeable crypto asset in the application's universe.
 * `id` is the canonical key used everywhere (watchlists, portfolio, alerts).
 * It is the CoinGecko coin id (e.g. "bitcoin"), which is stable and unique.
 */
export interface CryptoAsset {
  id: string
  symbol: string // upper-case, e.g. "BTC"
  name: string
  rank: number | null
  imageUrl: string | null
  /** Binance spot symbol (e.g. "BTCUSDT") when the asset trades there; used for fine-grained candles. */
  binanceSymbol: string | null
}

export interface Ticker {
  assetId: string
  symbol: string
  name: string
  rank: number | null
  imageUrl: string | null
  price: number
  change1hPct: number | null
  change24hPct: number | null
  change7dPct: number | null
  change30dPct: number | null
  marketCap: number | null
  volume24h: number | null
  high24h: number | null
  low24h: number | null
  circulatingSupply: number | null
  ath: number | null
  athDate: number | null
  /** Unix ms when the provider last updated this ticker. */
  updatedAt: number
}

/** A single candle. `time` is unix SECONDS (Lightweight Charts convention); `volume` is in base-asset units. */
export interface OHLCV {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface VolumeData {
  assetId: string
  volume24h: number | null
  /** Average daily volume over the trailing window (null when history is unavailable). */
  averageVolume: number | null
  windowDays: number
  /** volume24h / averageVolume, e.g. 2.0 = 200% of average. */
  ratio: number | null
}

export interface TickerSnapshot {
  tickers: Ticker[]
  /** USD → currency multipliers (e.g. { USD: 1, EUR: 0.86 }). */
  fxRates: Record<string, number>
  /** Unix ms when the snapshot was fetched from the provider. */
  updatedAt: number | null
  /** True when the data comes from the local cache because a live fetch failed. */
  stale: boolean
  provider: string
}

export interface OHLCVResult {
  assetId: string
  timeframe: Timeframe
  candles: OHLCV[]
  source: string
  updatedAt: number | null
  stale: boolean
}
