import { describe, it, expect } from 'vitest'
import { computeMetrics, sparklineMetrics } from '../electron/main/market/analyticsService'
import { historicalVolatility } from '../shared/analysis/volatility'
import { rsi } from '../shared/analysis/indicators'
import type { OHLCV } from '../shared/types'

const daily = (closes: number[]): OHLCV[] => closes.map((c, i) => ({ time: i * 86_400, open: c, high: c * 1.02, low: c * 0.98, close: c, volume: 10 }))

describe('computeMetrics', () => {
  it('derives volatility, RSI, MA relations and volume ratio from candles', () => {
    const closes = Array.from({ length: 220 }, (_, i) => 100 + Math.sin(i / 5) * 8 + i * 0.1)
    const candles = daily(closes)
    const m = computeMetrics({ id: 'x', symbol: 'X' }, candles, undefined, 5000)
    expect(m.source).toBe('daily')
    expect(m.vol7d).toBeCloseTo(historicalVolatility(closes, 7, '1d')!, 12)
    expect(m.vol30d).toBeCloseTo(historicalVolatility(closes, 30, '1d')!, 12)
    expect(m.rsi14).toBeCloseTo(rsi(closes, 14).at(-1)!, 12)
    expect(m.vsSma200Pct).not.toBeNull()
    // avg daily quote volume over the 30 complete days before the last candle
    const hist = candles.slice(0, -1).slice(-30)
    const avg = hist.reduce((s, c) => s + c.volume * c.close, 0) / hist.length
    expect(m.volumeRatio).toBeCloseTo(5000 / avg, 12)
    expect(m.history).toBe(220)
  })
  it('uses hourly candles for the 24h side when available (same-source comparison)', () => {
    const candles = daily(Array.from({ length: 60 }, (_, i) => 10 + i * 0.01))
    const hourly = Array.from({ length: 48 }, (_, i) => ({ time: i * 3600, open: 10, high: 10, low: 10, close: 10, volume: 2 }))
    const m = computeMetrics({ id: 'x', symbol: 'X' }, candles, hourly, 999_999)
    const hist = candles.slice(0, -1).slice(-30)
    const avg = hist.reduce((s, c) => s + c.volume * c.close, 0) / hist.length
    expect(m.volumeRatio).toBeCloseTo((24 * 2 * 10) / avg, 12)
  })
  it('leaves volume ratio null without a 24h volume', () => {
    expect(computeMetrics({ id: 'x', symbol: 'X' }, daily(Array.from({ length: 40 }, (_, i) => 10 + i)), undefined, null).volumeRatio).toBeNull()
  })
})

describe('sparklineMetrics', () => {
  it('computes 24h and 7d volatility from hourly prices only', () => {
    const prices = Array.from({ length: 168 }, (_, i) => 50 + Math.cos(i / 7) * 3)
    const m = sparklineMetrics({ id: 'y', symbol: 'Y' }, prices)
    expect(m.source).toBe('sparkline')
    expect(m.vol24h).toBeCloseTo(historicalVolatility(prices.slice(-25), 24, '1h')!, 12)
    expect(m.vol7d).toBeCloseTo(historicalVolatility(prices, 167, '1h')!, 12)
    expect(m.vol30d).toBeNull()
    expect(m.rsi14).toBeNull()
  })
})
