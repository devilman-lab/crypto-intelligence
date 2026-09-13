/**
 * Technical indicator engine.
 *
 * Pure functions over OHLCV arrays (oldest first). Every function returns an
 * array aligned 1:1 with the input; positions where the indicator is not yet
 * defined (warm-up period) contain `null`. No third-party math libraries are
 * used so the formulas are explicit and verifiable in tests/indicators.test.ts.
 */
import type { OHLCV } from '../types/market'

export type Series = (number | null)[]

function nullSeries(n: number): Series {
  return new Array<number | null>(n).fill(null)
}

/**
 * Simple Moving Average.
 *   SMA_t = (1/n) * Σ_{i=t-n+1..t} x_i
 */
export function sma(values: readonly number[], period: number): Series {
  const out = nullSeries(values.length)
  if (period <= 0) return out
  let sum = 0
  for (let i = 0; i < values.length; i++) {
    sum += values[i]!
    if (i >= period) sum -= values[i - period]!
    if (i >= period - 1) out[i] = sum / period
  }
  return out
}

/**
 * Exponential Moving Average, seeded with the SMA of the first `period` values
 * (the standard "Wilder-free" convention used by TradingView and most charting
 * packages).
 *   k = 2 / (n + 1)
 *   EMA_t = x_t * k + EMA_{t-1} * (1 - k)
 */
export function ema(values: readonly number[], period: number): Series {
  const out = nullSeries(values.length)
  if (period <= 0 || values.length < period) return out
  const k = 2 / (period + 1)
  let seed = 0
  for (let i = 0; i < period; i++) seed += values[i]!
  let prev = seed / period
  out[period - 1] = prev
  for (let i = period; i < values.length; i++) {
    prev = values[i]! * k + prev * (1 - k)
    out[i] = prev
  }
  return out
}

/**
 * Relative Strength Index (Wilder).
 *   First average gain/loss = simple mean over the first `period` changes.
 *   Then: avgGain_t = (avgGain_{t-1} * (n-1) + gain_t) / n   (same for loss)
 *   RS = avgGain / avgLoss ;  RSI = 100 - 100 / (1 + RS)
 * When avgLoss = 0, RSI = 100 (and 0 when avgGain = 0 with avgLoss > 0).
 */
export function rsi(closes: readonly number[], period = 14): Series {
  const out = nullSeries(closes.length)
  if (period <= 0 || closes.length <= period) return out
  let gain = 0
  let loss = 0
  for (let i = 1; i <= period; i++) {
    const d = closes[i]! - closes[i - 1]!
    if (d > 0) gain += d
    else loss -= d
  }
  let avgGain = gain / period
  let avgLoss = loss / period
  out[period] = rsiValue(avgGain, avgLoss)
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i]! - closes[i - 1]!
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period
    out[i] = rsiValue(avgGain, avgLoss)
  }
  return out
}

function rsiValue(avgGain: number, avgLoss: number): number {
  if (avgLoss === 0) return avgGain === 0 ? 50 : 100
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

export interface MacdResult {
  macd: Series
  signal: Series
  histogram: Series
}

/**
 * MACD.
 *   MACD_t   = EMA_fast(close) - EMA_slow(close)
 *   Signal_t = EMA_signal(MACD)          (seeded with the SMA of the first `signal` MACD values)
 *   Hist_t   = MACD_t - Signal_t
 */
export function macd(closes: readonly number[], fast = 12, slow = 26, signal = 9): MacdResult {
  const n = closes.length
  const fastE = ema(closes, fast)
  const slowE = ema(closes, slow)
  const macdLine = nullSeries(n)
  for (let i = 0; i < n; i++) {
    const f = fastE[i]
    const s = slowE[i]
    if (f != null && s != null) macdLine[i] = f - s
  }
  // Signal EMA over the defined part of the MACD line.
  const firstIdx = macdLine.findIndex((v) => v != null)
  const signalLine = nullSeries(n)
  const histogram = nullSeries(n)
  if (firstIdx >= 0) {
    const defined = macdLine.slice(firstIdx) as number[]
    const sig = ema(defined, signal)
    for (let i = 0; i < defined.length; i++) {
      const s = sig[i]
      if (s != null) {
        signalLine[firstIdx + i] = s
        histogram[firstIdx + i] = defined[i]! - s
      }
    }
  }
  return { macd: macdLine, signal: signalLine, histogram }
}

export interface BollingerResult {
  upper: Series
  middle: Series
  lower: Series
  /** (upper - lower) / middle, a normalised width measure. */
  bandwidth: Series
}

/**
 * Bollinger Bands.
 *   middle = SMA_n(close)
 *   σ      = population standard deviation over the same n closes
 *   upper  = middle + k·σ ; lower = middle − k·σ
 */
export function bollinger(closes: readonly number[], period = 20, mult = 2): BollingerResult {
  const n = closes.length
  const middle = sma(closes, period)
  const upper = nullSeries(n)
  const lower = nullSeries(n)
  const bandwidth = nullSeries(n)
  for (let i = period - 1; i < n; i++) {
    const m = middle[i]
    if (m == null) continue
    let ss = 0
    for (let j = i - period + 1; j <= i; j++) {
      const d = closes[j]! - m
      ss += d * d
    }
    const sd = Math.sqrt(ss / period)
    upper[i] = m + mult * sd
    lower[i] = m - mult * sd
    bandwidth[i] = m !== 0 ? (upper[i]! - lower[i]!) / m : null
  }
  return { upper, middle, lower, bandwidth }
}

/**
 * True Range.
 *   TR_t = max(high_t − low_t, |high_t − close_{t-1}|, |low_t − close_{t-1}|)
 * For the first candle TR = high − low.
 */
export function trueRange(candles: readonly OHLCV[]): number[] {
  return candles.map((c, i) => {
    if (i === 0) return c.high - c.low
    const prev = candles[i - 1]!.close
    return Math.max(c.high - c.low, Math.abs(c.high - prev), Math.abs(c.low - prev))
  })
}

/**
 * Average True Range (Wilder smoothing).
 *   ATR_n (first) = mean(TR_1..TR_n)
 *   ATR_t = (ATR_{t-1} · (n − 1) + TR_t) / n
 */
export function atr(candles: readonly OHLCV[], period = 14): Series {
  const tr = trueRange(candles)
  const out = nullSeries(candles.length)
  if (period <= 0 || candles.length < period) return out
  let sum = 0
  for (let i = 0; i < period; i++) sum += tr[i]!
  let prev = sum / period
  out[period - 1] = prev
  for (let i = period; i < candles.length; i++) {
    prev = (prev * (period - 1) + tr[i]!) / period
    out[i] = prev
  }
  return out
}

export interface StochasticResult {
  k: Series
  d: Series
}

/**
 * Stochastic Oscillator.
 *   %K_raw = 100 · (close − lowest low_n) / (highest high_n − lowest low_n)
 *   %K     = SMA_smoothK(%K_raw)   ("slow" stochastic; smoothK = 1 gives the fast version)
 *   %D     = SMA_smoothD(%K)
 */
export function stochastic(candles: readonly OHLCV[], period = 14, smoothK = 3, smoothD = 3): StochasticResult {
  const n = candles.length
  const raw = nullSeries(n)
  for (let i = period - 1; i < n; i++) {
    let hh = -Infinity
    let ll = Infinity
    for (let j = i - period + 1; j <= i; j++) {
      const c = candles[j]!
      if (c.high > hh) hh = c.high
      if (c.low < ll) ll = c.low
    }
    const range = hh - ll
    raw[i] = range === 0 ? 50 : (100 * (candles[i]!.close - ll)) / range
  }
  const k = smoothSeries(raw, smoothK)
  const d = smoothSeries(k, smoothD)
  return { k, d }
}

/** SMA over a series that may contain leading nulls; output aligned to input. */
function smoothSeries(series: Series, period: number): Series {
  const out = nullSeries(series.length)
  if (period <= 1) return series.slice()
  for (let i = 0; i < series.length; i++) {
    if (i < period - 1) continue
    let sum = 0
    let ok = true
    for (let j = i - period + 1; j <= i; j++) {
      const v = series[j]
      if (v == null) {
        ok = false
        break
      }
      sum += v
    }
    if (ok) out[i] = sum / period
  }
  return out
}

/**
 * Volume Weighted Average Price, cumulative from the start of the series
 * (or reset at each UTC day boundary when `resetDaily` is true — the usual
 * intraday convention).
 *   typical_t = (high + low + close) / 3
 *   VWAP_t = Σ(typical · volume) / Σ(volume)
 */
export function vwap(candles: readonly OHLCV[], resetDaily = true): Series {
  const out = nullSeries(candles.length)
  let pv = 0
  let vol = 0
  let currentDay = -1
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i]!
    const day = Math.floor(c.time / 86_400)
    if (resetDaily && day !== currentDay) {
      pv = 0
      vol = 0
      currentDay = day
    }
    const typical = (c.high + c.low + c.close) / 3
    pv += typical * c.volume
    vol += c.volume
    out[i] = vol > 0 ? pv / vol : null
  }
  return out
}

/** Convenience: last non-null value of a series. */
export function last(series: Series): number | null {
  for (let i = series.length - 1; i >= 0; i--) {
    const v = series[i]
    if (v != null) return v
  }
  return null
}

export const closes = (candles: readonly OHLCV[]): number[] => candles.map((c) => c.close)
