import { describe, it, expect } from 'vitest'
import { atr, bollinger, ema, last, macd, rsi, sma, stochastic, trueRange, vwap } from '../shared/analysis/indicators'
import type { OHLCV } from '../shared/types'

const candle = (time: number, o: number, h: number, l: number, c: number, v = 1): OHLCV => ({ time, open: o, high: h, low: l, close: c, volume: v })

describe('sma', () => {
  it('computes a rolling mean with null warm-up', () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4])
  })
  it('returns all nulls when period exceeds length or is invalid', () => {
    expect(sma([1, 2], 3)).toEqual([null, null])
    expect(sma([1, 2], 0)).toEqual([null, null])
  })
})

describe('ema', () => {
  it('seeds with SMA and applies k = 2/(n+1)', () => {
    // period 3 -> k = 0.5; seed = mean(1,2,3) = 2; then 4*0.5+2*0.5 = 3, ...
    expect(ema([1, 2, 3, 4, 5, 6], 3)).toEqual([null, null, 2, 3, 4, 5])
  })
  it('matches a hand-computed 10-period EMA step', () => {
    const values = [22.27, 22.19, 22.08, 22.17, 22.18, 22.13, 22.23, 22.43, 22.24, 22.29, 22.15]
    const out = ema(values, 10)
    expect(out[9]).toBeCloseTo(22.221, 3)
    // EMA_11 = 22.15 * (2/11) + 22.221 * (9/11) = 22.208
    expect(out[10]).toBeCloseTo(22.208, 3)
  })
})

describe('rsi', () => {
  // Reference data set (StockCharts RSI worked example, 14 periods).
  const closes = [
    44.3389, 44.0902, 44.1497, 43.6124, 44.3278, 44.8264, 45.0955, 45.4245, 45.8433, 46.0826, 45.8931, 46.0328, 45.614, 46.282, 46.282, 46.0028, 46.0328, 46.4116,
    46.2222, 45.6439, 46.2122, 46.2521, 45.7137, 46.4515, 45.7835, 45.3548, 44.0288, 44.1783, 44.2181, 44.5672, 43.4205, 42.6628, 43.1314
  ]
  const expected = [70.53, 66.32, 66.55, 69.41, 66.36, 57.97, 62.93, 63.26, 56.06, 62.38, 54.71, 50.42, 39.99, 41.46, 41.87, 45.46, 37.3, 33.08, 37.77]

  it('reproduces the published reference values (Wilder smoothing)', () => {
    const out = rsi(closes, 14)
    expect(out.slice(0, 14).every((v) => v === null)).toBe(true)
    expected.forEach((e, i) => expect(out[14 + i]).toBeCloseTo(e, 1))
  })

  it('handles zero-loss and flat series', () => {
    expect(rsi([1, 2, 3, 4, 5, 6], 3)[3]).toBe(100)
    expect(rsi([5, 5, 5, 5, 5], 3)[3]).toBe(50)
    expect(rsi([6, 5, 4, 3, 2], 3)[3]).toBe(0)
  })
})

describe('macd', () => {
  it('equals EMA(fast) - EMA(slow) and signal is the EMA of the MACD line', () => {
    const closes = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i / 3) * 5 + i * 0.2)
    const { macd: line, signal, histogram } = macd(closes, 12, 26, 9)
    const f = ema(closes, 12)
    const s = ema(closes, 26)
    for (let i = 0; i < closes.length; i++) {
      if (i < 25) {
        expect(line[i]).toBeNull()
        continue
      }
      expect(line[i]).toBeCloseTo(f[i]! - s[i]!, 10)
    }
    // Signal defined from index 25 + 8 = 33.
    expect(signal[32]).toBeNull()
    expect(signal[33]).not.toBeNull()
    const definedMacd = line.slice(25) as number[]
    const sig = ema(definedMacd, 9)
    expect(signal[40]).toBeCloseTo(sig[15]!, 10)
    expect(histogram[40]).toBeCloseTo(line[40]! - signal[40]!, 10)
  })
})

describe('bollinger', () => {
  it('uses population standard deviation', () => {
    const { upper, middle, lower, bandwidth } = bollinger([1, 2, 3, 4, 5], 5, 2)
    expect(middle[4]).toBe(3)
    expect(upper[4]).toBeCloseTo(3 + 2 * Math.SQRT2, 10)
    expect(lower[4]).toBeCloseTo(3 - 2 * Math.SQRT2, 10)
    expect(bandwidth[4]).toBeCloseTo((4 * Math.SQRT2) / 3, 10)
  })
  it('collapses to the middle for a constant series', () => {
    const { upper, lower, middle } = bollinger([7, 7, 7, 7], 4)
    expect(upper[3]).toBe(7)
    expect(lower[3]).toBe(7)
    expect(middle[3]).toBe(7)
  })
})

describe('trueRange / atr', () => {
  const candles = [candle(0, 10, 12, 9, 11), candle(1, 11, 13, 10.5, 12.5), candle(2, 12.5, 12.8, 11, 11.2), candle(3, 11.2, 14, 11, 13.9)]
  it('computes true range with gaps vs previous close', () => {
    // TR0 = 12-9 = 3 ; TR1 = max(2.5, |13-11|=2, |10.5-11|=0.5) = 2.5
    // TR2 = max(1.8, |12.8-12.5|=0.3, |11-12.5|=1.5) = 1.8 ; TR3 = max(3, |14-11.2|=2.8, |11-11.2|=0.2) = 3
    const tr = trueRange(candles)
    ;[3, 2.5, 1.8, 3].forEach((v, i) => expect(tr[i]).toBeCloseTo(v, 10))
  })
  it('applies Wilder smoothing after the SMA seed', () => {
    const out = atr(candles, 2)
    expect(out[0]).toBeNull()
    expect(out[1]).toBeCloseTo(2.75, 10) // (3+2.5)/2
    expect(out[2]).toBeCloseTo((2.75 * 1 + 1.8) / 2, 10)
    expect(out[3]).toBeCloseTo(((2.75 + 1.8) / 2 + 3) / 2, 10)
  })
})

describe('stochastic', () => {
  it('computes raw %K and smooths %K and %D', () => {
    const candles = [candle(0, 0, 10, 5, 6), candle(1, 0, 11, 6, 10), candle(2, 0, 12, 7, 12), candle(3, 0, 12, 6, 9), candle(4, 0, 13, 8, 8)]
    const { k, d } = stochastic(candles, 3, 1, 2)
    // i=2: hh=12 ll=5 -> (12-5)/(7) = 100 ; i=3: hh=12 ll=6 -> (9-6)/6 = 50 ; i=4: hh=13 ll=6 -> (8-6)/7 = 28.571
    expect(k[1]).toBeNull()
    expect(k[2]).toBeCloseTo(100, 10)
    expect(k[3]).toBeCloseTo(50, 10)
    expect(k[4]).toBeCloseTo(28.5714, 3)
    expect(d[2]).toBeNull()
    expect(d[3]).toBeCloseTo(75, 10)
    expect(d[4]).toBeCloseTo((50 + 28.5714) / 2, 3)
  })
  it('returns 50 for a flat range', () => {
    const flat = [candle(0, 1, 1, 1, 1), candle(1, 1, 1, 1, 1)]
    expect(stochastic(flat, 2, 1, 1).k[1]).toBe(50)
  })
})

describe('vwap', () => {
  it('accumulates typical price × volume and resets at UTC day boundaries', () => {
    const day = 86_400
    const candles = [candle(0, 0, 12, 8, 10, 100), candle(3600, 0, 22, 18, 20, 100), candle(day, 0, 32, 28, 30, 50)]
    const out = vwap(candles, true)
    expect(out[0]).toBeCloseTo(10, 10)
    expect(out[1]).toBeCloseTo(15, 10)
    expect(out[2]).toBeCloseTo(30, 10)
    expect(vwap(candles, false)[2]).toBeCloseTo((10 * 100 + 20 * 100 + 30 * 50) / 250, 10)
  })
  it('yields null while cumulative volume is zero', () => {
    expect(vwap([candle(0, 1, 1, 1, 1, 0)])[0]).toBeNull()
  })
})

describe('last', () => {
  it('returns the trailing defined value', () => {
    expect(last([null, 1, 2, null])).toBe(2)
    expect(last([null])).toBeNull()
  })
})
