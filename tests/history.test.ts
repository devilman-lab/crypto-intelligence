import { describe, it, expect } from 'vitest'
import { analyseHistory, metricSeries } from '../shared/analysis/history'
import type { OHLCV } from '../shared/types'

const candles = (closes: number[]): OHLCV[] => closes.map((c, i) => ({ time: i * 86_400, open: c, high: c * 1.05, low: c * 0.95, close: c, volume: 100 }))

describe('metricSeries', () => {
  it('computes daily change and 30d drawdown', () => {
    const cs = candles([100, 110, 99, ...Array(40).fill(99)])
    const change = metricSeries(cs, 'change1d')
    expect(change[0]).toBeNull()
    expect(change[1]).toBeCloseTo(10, 10)
    expect(change[2]).toBeCloseTo(-10, 10)
    const dd = metricSeries(cs, 'drawdownFromHigh30d')
    expect(dd[29]).toBeNull()
    expect(dd[31]).toBeCloseTo((99 / 110 - 1) * 100, 10) // 110 still inside the prior-30 window
  })
  it('computes volume ratio vs the trailing 30-day average', () => {
    const cs = candles(Array(40).fill(10))
    cs[35]!.volume = 300
    const vr = metricSeries(cs, 'volumeRatio')
    expect(vr[35]).toBeCloseTo(300, 10)
    expect(vr[34]).toBeCloseTo(100, 10)
  })
})

describe('analyseHistory', () => {
  // Daily change > 5% happens at idx 5 (100->110) and idx 20 (100->120) with recoveries after.
  const closes = [100, 100, 100, 100, 100, 110, 112, 115, 111, 110, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 120, 121, 118, 130, 125, 100, 100, 100, 100, 100]
  const cs = candles(closes)

  it('finds episodes once, computes forward returns and excursions', () => {
    const r = analyseHistory(cs, { metric: 'change1d', direction: 'above', threshold: 5 }, 3)
    expect(r.count).toBe(2)
    const [a, b] = r.occurrences
    expect(a!.index).toBe(5)
    expect(a!.returnPct).toBeCloseTo((111 / 110 - 1) * 100, 10) // exit at idx 8
    expect(a!.maxGainPct).toBeCloseTo((115 * 1.05 / 110 - 1) * 100, 10)
    expect(b!.index).toBe(20)
    expect(b!.returnPct).toBeCloseTo((130 / 120 - 1) * 100, 10)
    expect(r.positive).toBe(2)
    expect(r.negative).toBe(0)
    expect(r.positiveSharePct).toBe(100)
    expect(r.meanReturnPct).toBeCloseTo((a!.returnPct + b!.returnPct) / 2, 10)
    expect(r.medianReturnPct).toBeCloseTo(r.meanReturnPct!, 10)
    expect(r.maxReturnPct).toBeCloseTo(Math.max(a!.returnPct, b!.returnPct), 10)
    expect(r.baselineMeanReturnPct).not.toBeNull()
    expect(r.distribution.reduce((s, d) => s + d.count, 0)).toBe(2)
  })

  it('skips occurrences without a full horizon and applies the cooldown', () => {
    // change > 5% at the very end has no forward data.
    const r = analyseHistory(candles([100, 100, 100, 100, 120]), { metric: 'change1d', direction: 'above', threshold: 5 }, 3)
    expect(r.count).toBe(0)
    expect(r.meanReturnPct).toBeNull()
    // Two spikes separated by one quiet day count once with cooldown 3, twice with cooldown 1.
    const c2 = candles([100, 110, 100, 110, 100, 100, 100, 100, 100, 100])
    expect(analyseHistory(c2, { metric: 'change1d', direction: 'above', threshold: 5 }, 2, 3).count).toBe(1)
    expect(analyseHistory(c2, { metric: 'change1d', direction: 'above', threshold: 5 }, 2, 1).count).toBe(2)
  })

  it('returns empty stats when the condition never occurs', () => {
    const r = analyseHistory(cs, { metric: 'change1d', direction: 'above', threshold: 50 }, 3)
    expect(r.count).toBe(0)
    expect(r.distribution).toEqual([])
    expect(r.positiveSharePct).toBeNull()
  })
})
