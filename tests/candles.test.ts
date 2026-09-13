import { describe, it, expect } from 'vitest'
import { aggregateCandles, sanitizeCandles } from '../electron/main/market/candles'
import type { OHLCV } from '../shared/types'

const c = (time: number, o: number, h: number, l: number, cl: number, v: number): OHLCV => ({ time, open: o, high: h, low: l, close: cl, volume: v })

describe('aggregateCandles', () => {
  it('aggregates 1h candles into 4h buckets aligned to epoch', () => {
    const base = 1_700_000_000 - (1_700_000_000 % 14400) // aligned 4h boundary
    const hours = [0, 1, 2, 3, 4, 5].map((i) => c(base + i * 3600, 10 + i, 12 + i, 9 + i, 11 + i, 1))
    const out = aggregateCandles(hours, '1h', '4h')
    expect(out).toHaveLength(2)
    expect(out[0]).toEqual({ time: base, open: 10, high: 15, low: 9, close: 14, volume: 4 })
    expect(out[1]).toEqual({ time: base + 14400, open: 14, high: 17, low: 13, close: 16, volume: 2 })
  })

  it('aligns weekly buckets to Monday 00:00 UTC', () => {
    // 2024-01-01 is a Monday.
    const monday = Date.UTC(2024, 0, 1) / 1000
    const days = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => c(monday + i * 86400, 1, 2, 0.5, 1.5, 1))
    const out = aggregateCandles(days, '1d', '1w')
    expect(out).toHaveLength(2)
    expect(out[0]?.time).toBe(monday)
    expect(out[0]?.volume).toBe(7)
    expect(out[1]?.time).toBe(monday + 7 * 86400)
  })

  it('returns input unchanged when target is not coarser', () => {
    const input = [c(0, 1, 1, 1, 1, 1)]
    expect(aggregateCandles(input, '1d', '1h')).toBe(input)
  })
})

describe('sanitizeCandles', () => {
  it('drops malformed rows and de-duplicates by time, ascending', () => {
    const out = sanitizeCandles([
      c(20, 1, 2, 0.5, 1.5, 1),
      c(10, 1, 2, 0.5, 1.5, 1),
      c(10, 2, 3, 1, 2.5, 2), // duplicate time: last wins
      c(30, NaN, 2, 1, 1, 1), // NaN
      c(40, 1, 0.5, 2, 1, 1), // high < low
      c(50, 0, 1, 0, 1, 1) // zero open
    ])
    expect(out.map((x) => x.time)).toEqual([10, 20])
    expect(out[0]?.open).toBe(2)
  })
})
