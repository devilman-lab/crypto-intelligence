/**
 * Volatility engine.
 *
 * All volatility figures are *realised* (historical) volatility computed from
 * past prices. They describe what happened; they are not forecasts.
 *
 * Definitions (see docs/indicators.md → Volatility):
 *   r_t   = ln(P_t / P_{t-1})                       (log return)
 *   σ     = sqrt( Σ (r_t − r̄)² / (n − 1) )           (sample standard deviation of returns)
 *   σ_ann = σ · sqrt(periodsPerYear)                  (annualised, crypto trades 365 days)
 *
 * Periods per year: 1d candles → 365; 1h → 8760; 4h → 2190; 1w → 52.
 */
import type { OHLCV, Timeframe } from '../types/market'
import { TIMEFRAME_SECONDS } from '../types/market'
import { atr } from './indicators'

export type Series = (number | null)[]

const SECONDS_PER_YEAR = 365 * 86_400

export function periodsPerYear(timeframe: Timeframe): number {
  return SECONDS_PER_YEAR / TIMEFRAME_SECONDS[timeframe]
}

/** Log returns; index 0 is null (no previous close). */
export function logReturns(closes: readonly number[]): Series {
  const out: Series = new Array(closes.length).fill(null)
  for (let i = 1; i < closes.length; i++) {
    const p = closes[i - 1]!
    const c = closes[i]!
    if (p > 0 && c > 0) out[i] = Math.log(c / p)
  }
  return out
}

/** Sample standard deviation (n − 1 denominator). Returns null with fewer than 2 values. */
export function sampleStdDev(values: readonly number[]): number | null {
  const n = values.length
  if (n < 2) return null
  let mean = 0
  for (const v of values) mean += v
  mean /= n
  let ss = 0
  for (const v of values) ss += (v - mean) ** 2
  return Math.sqrt(ss / (n - 1))
}

/**
 * Historical volatility over the trailing `window` returns, annualised.
 * Expressed as a fraction (0.85 = 85%).
 */
export function historicalVolatility(closes: readonly number[], window: number, timeframe: Timeframe): number | null {
  const rets = logReturns(closes).filter((r): r is number => r != null)
  if (rets.length < window || window < 2) return null
  const sd = sampleStdDev(rets.slice(-window))
  return sd == null ? null : sd * Math.sqrt(periodsPerYear(timeframe))
}

/** Rolling annualised volatility series aligned with `closes` (null during warm-up). */
export function rollingVolatility(closes: readonly number[], window: number, timeframe: Timeframe): Series {
  const rets = logReturns(closes)
  const out: Series = new Array(closes.length).fill(null)
  if (window < 2) return out
  const ann = Math.sqrt(periodsPerYear(timeframe))
  // Welford-free simple approach: maintain sums over the window.
  let sum = 0
  let sumSq = 0
  let count = 0
  for (let i = 1; i < closes.length; i++) {
    const r = rets[i]
    if (r == null) continue
    sum += r
    sumSq += r * r
    count++
    if (count > window) {
      const old = rets[i - window]!
      sum -= old
      sumSq -= old * old
      count--
    }
    if (count === window) {
      const mean = sum / window
      const variance = Math.max(0, (sumSq - window * mean * mean) / (window - 1))
      out[i] = Math.sqrt(variance) * ann
    }
  }
  return out
}

/**
 * Percentile rank (0–100) of `value` within `history` (fraction of values ≤ value).
 * Returns null for empty history.
 */
export function percentileRank(value: number, history: readonly number[]): number | null {
  if (history.length === 0) return null
  let below = 0
  for (const h of history) if (h <= value) below++
  return (below / history.length) * 100
}

export interface VolatilitySnapshot {
  /** Annualised realised volatility over the trailing 24h / 7d / 30d windows (fractions). */
  vol24h: number | null
  vol7d: number | null
  vol30d: number | null
  /** Where the current 7d volatility sits within the last year of rolling 7d readings (0–100). */
  percentile: number | null
  /** Relative change of 7d volatility versus the prior 7d window (fraction; +0.18 = +18%). */
  change: number | null
  /** ATR(14) on the given candles as a percentage of the last close. */
  atrPct: number | null
}

/**
 * Computes the standard snapshot from daily candles (oldest first).
 * With hourly candles the 24h window would use 24 returns; here we use daily
 * candles so "24h" is the single most recent daily return's magnitude
 * annualised (a crude but standard 1-day realised proxy) — see note below.
 *
 * Note on vol24h: a single daily return has no dispersion, so the 24h figure
 * is computed from the last 24 *hourly* returns when `hourly` is provided,
 * and left null otherwise.
 */
export function volatilitySnapshot(daily: readonly OHLCV[], hourly?: readonly OHLCV[]): VolatilitySnapshot {
  const closes = daily.map((c) => c.close)
  const vol7d = historicalVolatility(closes, 7, '1d')
  const vol30d = historicalVolatility(closes, 30, '1d')
  const vol24h = hourly && hourly.length >= 25 ? historicalVolatility(hourly.map((c) => c.close), 24, '1h') : null

  const rolling7 = rollingVolatility(closes, 7, '1d')
  const definedRolling = rolling7.filter((v): v is number => v != null)
  const history = definedRolling.slice(-365)
  const percentile = vol7d != null && history.length >= 30 ? percentileRank(vol7d, history) : null

  // Prior 7d window: the rolling value 7 candles earlier.
  const prevIdx = rolling7.length - 1 - 7
  const prev = prevIdx >= 0 ? rolling7[prevIdx] : null
  const change = vol7d != null && prev != null && prev > 0 ? vol7d / prev - 1 : null

  const lastClose = closes[closes.length - 1]
  const atrSeries = atr(daily, 14)
  const lastAtr = atrSeries[atrSeries.length - 1] ?? null
  const atrPct = lastAtr != null && lastClose ? (lastAtr / lastClose) * 100 : null

  return { vol24h, vol7d, vol30d, percentile, change, atrPct }
}
