/**
 * Per-asset derived metrics computed by the main-process AnalyticsService
 * from cached candles. All volatility numbers are realised/historical.
 */
export interface AssetMetrics {
  assetId: string
  symbol: string
  /** Annualised realised volatility (fractions, 0.85 = 85%). */
  vol24h: number | null
  vol7d: number | null
  vol30d: number | null
  /** Percentile of current 7d volatility within the trailing year (0–100). */
  volPercentile: number | null
  /** Relative change of 7d volatility vs the previous 7d window (fraction). */
  volChange: number | null
  /** ATR(14) on daily candles as % of price. */
  atrPct: number | null
  /** RSI(14) on daily candles. */
  rsi14: number | null
  /** Bollinger %B (20, 2) on daily candles. */
  bbPercentB: number | null
  /** Price vs SMA50 / SMA200 in percent (+5 = 5% above). */
  vsSma50Pct: number | null
  vsSma200Pct: number | null
  /** MACD histogram sign on daily candles. */
  macdHist: number | null
  /** 24h volume / trailing 30-day average daily volume (2.0 = 200%). */
  volumeRatio: number | null
  /** Number of daily candles available (0 when derived from the hourly sparkline only). */
  history: number
  /** 'daily' = full candle history; 'sparkline' = 7-day hourly prices only (no 30d/RSI/MA metrics). */
  source: 'daily' | 'sparkline'
  computedAt: number
}

export interface AnalyticsSnapshot {
  metrics: Record<string, AssetMetrics>
  updatedAt: number | null
  progress: { done: number; total: number; running: boolean }
}
