import { TIMEFRAME_SECONDS, type OHLCV, type Timeframe } from '@shared/types'

/**
 * Aggregates candles from a finer timeframe into a coarser one.
 * Buckets are aligned to unix epoch multiples of the target interval
 * (weekly buckets align to Monday 00:00 UTC, matching exchange convention).
 */
export function aggregateCandles(candles: OHLCV[], from: Timeframe, to: Timeframe): OHLCV[] {
  const target = TIMEFRAME_SECONDS[to]
  if (TIMEFRAME_SECONDS[from] >= target) return candles
  // Unix epoch (Thu) -> shift by 3 days so weekly buckets start on Monday.
  const offset = to === '1w' ? 3 * 86_400 : 0
  const out: OHLCV[] = []
  let current: OHLCV | null = null
  for (const c of candles) {
    const bucket = Math.floor((c.time + offset) / target) * target - offset
    if (!current || current.time !== bucket) {
      if (current) out.push(current)
      current = { time: bucket, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume }
    } else {
      current.high = Math.max(current.high, c.high)
      current.low = Math.min(current.low, c.low)
      current.close = c.close
      current.volume += c.volume
    }
  }
  if (current) out.push(current)
  return out
}

/** Drops malformed candles and enforces ascending unique timestamps. */
export function sanitizeCandles(candles: OHLCV[]): OHLCV[] {
  const byTime = new Map<number, OHLCV>()
  for (const c of candles) {
    if (![c.time, c.open, c.high, c.low, c.close, c.volume].every((n) => typeof n === 'number' && Number.isFinite(n))) continue
    if (c.high < c.low || c.open <= 0 || c.close <= 0) continue
    byTime.set(c.time, c)
  }
  return [...byTime.values()].sort((a, b) => a.time - b.time)
}
