/**
 * Historical event analysis (pure).
 *
 * "When <condition> was true in the past, what happened over the following
 * N candles?" Results are *historical observations* — descriptive statistics
 * of past data — and are never a forecast.
 *
 * Episode handling: consecutive candles satisfying the condition form one
 * episode; only the first candle of an episode counts as an occurrence, and
 * a new episode can only start after the condition has been false for
 * `cooldown` candles. Forward return = close[t + horizon] / close[t] − 1.
 */
import type { OHLCV } from '../types/market'
import { rsi } from './indicators'
import { rollingVolatility } from './volatility'

export type HistoryMetric = 'vol7d' | 'vol30d' | 'rsi14' | 'change1d' | 'volumeRatio' | 'drawdownFromHigh30d'
export type HistoryDirection = 'above' | 'below'

export interface HistoryCondition {
  metric: HistoryMetric
  direction: HistoryDirection
  /** Percent for vol/change/volumeRatio/drawdown, points for RSI. */
  threshold: number
}

export const HISTORY_METRIC_META: Record<HistoryMetric, { label: string; unit: string; description: string }> = {
  vol7d: { label: 'Volatility (7d, annualised)', unit: '%', description: 'Rolling 7-day realised volatility' },
  vol30d: { label: 'Volatility (30d, annualised)', unit: '%', description: 'Rolling 30-day realised volatility' },
  rsi14: { label: 'RSI (14)', unit: '', description: 'Daily RSI' },
  change1d: { label: 'Daily change', unit: '%', description: 'Close-to-close change of the day' },
  volumeRatio: { label: 'Volume vs 30d average', unit: '%', description: 'Day volume as % of the trailing 30-day average' },
  drawdownFromHigh30d: { label: 'Drawdown from 30d high', unit: '%', description: 'Close relative to the highest close of the prior 30 days (negative = below)' }
}

export interface HistoryOccurrence {
  /** Index of the triggering candle. */
  index: number
  time: number
  metricValue: number
  entryClose: number
  exitClose: number
  /** Forward return in percent. */
  returnPct: number
  /** Max favourable / adverse excursion within the horizon, in percent. */
  maxGainPct: number
  maxLossPct: number
}

export interface HistoryResult {
  occurrences: HistoryOccurrence[]
  /** Occurrences that had a full horizon of data after them. */
  count: number
  meanReturnPct: number | null
  medianReturnPct: number | null
  positive: number
  negative: number
  positiveSharePct: number | null
  maxReturnPct: number | null
  minReturnPct: number | null
  avgMaxGainPct: number | null
  avgMaxLossPct: number | null
  stdDevPct: number | null
  /** Unconditional (all-candle) mean forward return over the same horizon, for context. */
  baselineMeanReturnPct: number | null
  /** Histogram of forward returns. */
  distribution: { from: number; to: number; count: number }[]
  candlesAnalysed: number
}

export function metricSeries(candles: readonly OHLCV[], metric: HistoryMetric): (number | null)[] {
  const closes = candles.map((c) => c.close)
  switch (metric) {
    case 'vol7d':
      return rollingVolatility(closes, 7, '1d').map((v) => (v == null ? null : v * 100))
    case 'vol30d':
      return rollingVolatility(closes, 30, '1d').map((v) => (v == null ? null : v * 100))
    case 'rsi14':
      return rsi(closes, 14)
    case 'change1d':
      return closes.map((c, i) => (i === 0 || closes[i - 1]! <= 0 ? null : (c / closes[i - 1]! - 1) * 100))
    case 'volumeRatio':
      return candles.map((c, i) => {
        if (i < 30) return null
        let sum = 0
        for (let j = i - 30; j < i; j++) sum += candles[j]!.volume * candles[j]!.close
        const avg = sum / 30
        return avg > 0 ? ((c.volume * c.close) / avg) * 100 : null
      })
    case 'drawdownFromHigh30d':
      return closes.map((c, i) => {
        if (i < 30) return null
        let high = -Infinity
        for (let j = i - 30; j < i; j++) if (closes[j]! > high) high = closes[j]!
        return high > 0 ? (c / high - 1) * 100 : null
      })
  }
}

function conditionTrue(cond: HistoryCondition, v: number | null): boolean {
  if (v == null || !Number.isFinite(v)) return false
  return cond.direction === 'above' ? v > cond.threshold : v < cond.threshold
}

export function analyseHistory(candles: readonly OHLCV[], cond: HistoryCondition, horizon: number, cooldown = 3): HistoryResult {
  const series = metricSeries(candles, cond.metric)
  const occurrences: HistoryOccurrence[] = []
  let inEpisode = false
  let falseRun = cooldown
  for (let i = 0; i < candles.length; i++) {
    const met = conditionTrue(cond, series[i]!)
    if (!met) {
      falseRun++
      if (falseRun >= cooldown) inEpisode = false
      continue
    }
    falseRun = 0
    if (inEpisode) continue
    inEpisode = true
    if (i + horizon >= candles.length) continue // not enough forward data
    const entry = candles[i]!.close
    const exit = candles[i + horizon]!.close
    let hi = -Infinity
    let lo = Infinity
    for (let j = i + 1; j <= i + horizon; j++) {
      const c = candles[j]!
      if (c.high > hi) hi = c.high
      if (c.low < lo) lo = c.low
    }
    occurrences.push({
      index: i,
      time: candles[i]!.time,
      metricValue: series[i]!,
      entryClose: entry,
      exitClose: exit,
      returnPct: (exit / entry - 1) * 100,
      maxGainPct: (hi / entry - 1) * 100,
      maxLossPct: (lo / entry - 1) * 100
    })
  }

  const returns = occurrences.map((o) => o.returnPct)
  const n = returns.length
  const mean = n ? returns.reduce((s, r) => s + r, 0) / n : null
  const sorted = [...returns].sort((a, b) => a - b)
  const median = n ? (n % 2 ? sorted[(n - 1) / 2]! : (sorted[n / 2 - 1]! + sorted[n / 2]!) / 2) : null
  const positive = returns.filter((r) => r > 0).length
  const negative = returns.filter((r) => r < 0).length
  const sd = n > 1 && mean != null ? Math.sqrt(returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (n - 1)) : null

  // Baseline: every candle with a full horizon ahead.
  let baseSum = 0
  let baseN = 0
  for (let i = 0; i + horizon < candles.length; i++) {
    baseSum += (candles[i + horizon]!.close / candles[i]!.close - 1) * 100
    baseN++
  }

  return {
    occurrences,
    count: n,
    meanReturnPct: mean,
    medianReturnPct: median,
    positive,
    negative,
    positiveSharePct: n ? (positive / n) * 100 : null,
    maxReturnPct: n ? sorted[n - 1]! : null,
    minReturnPct: n ? sorted[0]! : null,
    avgMaxGainPct: n ? occurrences.reduce((s, o) => s + o.maxGainPct, 0) / n : null,
    avgMaxLossPct: n ? occurrences.reduce((s, o) => s + o.maxLossPct, 0) / n : null,
    stdDevPct: sd,
    baselineMeanReturnPct: baseN ? baseSum / baseN : null,
    distribution: histogram(returns),
    candlesAnalysed: candles.length
  }
}

function histogram(values: number[], buckets = 9): { from: number; to: number; count: number }[] {
  if (!values.length) return []
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (min === max) return [{ from: min, to: max, count: values.length }]
  // Symmetric-ish nice bucket width.
  const span = Math.max(Math.abs(min), Math.abs(max))
  const width = niceStep((2 * span) / buckets)
  const start = Math.floor(min / width) * width
  const end = Math.ceil(max / width) * width
  const out: { from: number; to: number; count: number }[] = []
  for (let from = start; from < end; from += width) out.push({ from, to: from + width, count: 0 })
  for (const v of values) {
    const idx = Math.min(out.length - 1, Math.floor((v - start) / width))
    out[idx]!.count++
  }
  return out
}

function niceStep(raw: number): number {
  const pow = 10 ** Math.floor(Math.log10(raw))
  const m = raw / pow
  const nice = m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10
  return nice * pow
}
