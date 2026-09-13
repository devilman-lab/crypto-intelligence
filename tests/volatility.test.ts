import { describe, it, expect } from 'vitest'
import { historicalVolatility, logReturns, percentileRank, periodsPerYear, rollingVolatility, sampleStdDev, volatilitySnapshot } from '../shared/analysis/volatility'
import type { OHLCV } from '../shared/types'

const daily = (closes: number[]): OHLCV[] => closes.map((c, i) => ({ time: i * 86_400, open: c, high: c * 1.01, low: c * 0.99, close: c, volume: 1 }))

describe('logReturns', () => {
  it('computes ln(P_t / P_{t-1}) with a null first element', () => {
    const r = logReturns([100, 110, 99])
    expect(r[0]).toBeNull()
    expect(r[1]).toBeCloseTo(Math.log(1.1), 12)
    expect(r[2]).toBeCloseTo(Math.log(0.9), 12)
  })
  it('skips non-positive prices', () => {
    expect(logReturns([1, 0, 2])).toEqual([null, null, null])
  })
})

describe('sampleStdDev', () => {
  it('uses the n-1 denominator', () => {
    // values 2,4,4,4,5,5,7,9: mean 5, Σ(x-mean)^2 = 32, sample var = 32/7
    expect(sampleStdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(Math.sqrt(32 / 7), 12)
    expect(sampleStdDev([1])).toBeNull()
  })
})

describe('periodsPerYear', () => {
  it('uses a 365-day crypto year', () => {
    expect(periodsPerYear('1d')).toBe(365)
    expect(periodsPerYear('1h')).toBe(8760)
    expect(periodsPerYear('1w')).toBeCloseTo(52.14, 2)
  })
})

describe('historicalVolatility', () => {
  it('annualises the sample std-dev of the trailing window of log returns', () => {
    const closes = [100, 102, 101, 105, 103]
    const rets = [Math.log(1.02), Math.log(101 / 102), Math.log(105 / 101), Math.log(103 / 105)]
    const expected = sampleStdDev(rets)! * Math.sqrt(365)
    expect(historicalVolatility(closes, 4, '1d')).toBeCloseTo(expected, 12)
  })
  it('returns null when there are not enough returns', () => {
    expect(historicalVolatility([1, 2, 3], 5, '1d')).toBeNull()
  })
  it('is zero for a constant series', () => {
    expect(historicalVolatility([5, 5, 5, 5], 3, '1d')).toBe(0)
  })
})

describe('rollingVolatility', () => {
  it('matches historicalVolatility at every index once warmed up', () => {
    const closes = Array.from({ length: 40 }, (_, i) => 100 + Math.sin(i) * 10 + i)
    const roll = rollingVolatility(closes, 7, '1d')
    for (let i = 0; i < closes.length; i++) {
      if (i < 7) expect(roll[i]).toBeNull()
      else expect(roll[i]).toBeCloseTo(historicalVolatility(closes.slice(0, i + 1), 7, '1d')!, 9)
    }
  })
})

describe('percentileRank', () => {
  it('returns the share of history at or below the value', () => {
    expect(percentileRank(5, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toBe(50)
    expect(percentileRank(100, [1, 2, 3])).toBe(100)
    expect(percentileRank(0, [1, 2, 3])).toBe(0)
    expect(percentileRank(1, [])).toBeNull()
  })
})

describe('volatilitySnapshot', () => {
  it('produces 7d/30d volatility, ATR% and change; 24h needs hourly candles', () => {
    const closes = Array.from({ length: 60 }, (_, i) => 100 * Math.exp(Math.sin(i / 2) * 0.05))
    const snap = volatilitySnapshot(daily(closes))
    expect(snap.vol7d).toBeCloseTo(historicalVolatility(closes, 7, '1d')!, 12)
    expect(snap.vol30d).toBeCloseTo(historicalVolatility(closes, 30, '1d')!, 12)
    expect(snap.vol24h).toBeNull()
    expect(snap.atrPct).toBeGreaterThan(0)
    expect(snap.change).not.toBeNull()
    // Percentile requires 30 rolling readings: 60 candles - 7 warm-up = 53 readings -> defined.
    expect(snap.percentile).not.toBeNull()
  })
  it('computes 24h volatility from hourly candles', () => {
    const hourly = Array.from({ length: 30 }, (_, i) => ({ time: i * 3600, open: 1, high: 1, low: 1, close: 100 + (i % 2), volume: 1 }))
    const snap = volatilitySnapshot(daily([1, 2, 3]), hourly)
    expect(snap.vol24h).toBeCloseTo(historicalVolatility(hourly.map((c) => c.close), 24, '1h')!, 12)
  })
})
