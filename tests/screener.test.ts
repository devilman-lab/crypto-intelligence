import { describe, it, expect } from 'vitest'
import { describeScreen, evaluateCondition, fieldValue, matchesScreen, runScreen, SCREEN_PRESETS, type ScreenDefinition } from '../shared/analysis/screener'
import type { AssetMetrics, Ticker } from '../shared/types'

const ticker = (over: Partial<Ticker> = {}): Ticker => ({
  assetId: 'x', symbol: 'X', name: 'X', rank: 10, imageUrl: null, price: 100, change1hPct: 0.5, change24hPct: 6, change7dPct: 12, change30dPct: 20,
  marketCap: 1e9, volume24h: 2e8, high24h: 105, low24h: 95, circulatingSupply: null, ath: null, athDate: null, updatedAt: 0, ...over
})
const metrics = (over: Partial<AssetMetrics> = {}): AssetMetrics => ({
  assetId: 'x', symbol: 'X', vol24h: 0.5, vol7d: 0.9, vol30d: 0.7, volPercentile: 80, volChange: 0.18, atrPct: 4, rsi14: 25, bbPercentB: 0.5,
  vsSma50Pct: 3, vsSma200Pct: 8, macdHist: 1, volumeRatio: 2.5, history: 300, source: 'daily', computedAt: 0, ...over
})

describe('evaluateCondition', () => {
  it('handles all operators and null values', () => {
    expect(evaluateCondition({ id: '1', field: 'rsi14', op: 'lt', value: 30 }, 25)).toBe(true)
    expect(evaluateCondition({ id: '1', field: 'rsi14', op: 'lt', value: 30 }, 30)).toBe(false)
    expect(evaluateCondition({ id: '1', field: 'rsi14', op: 'lte', value: 30 }, 30)).toBe(true)
    expect(evaluateCondition({ id: '1', field: 'rsi14', op: 'gt', value: 30 }, 31)).toBe(true)
    expect(evaluateCondition({ id: '1', field: 'rsi14', op: 'gte', value: 30 }, 30)).toBe(true)
    expect(evaluateCondition({ id: '1', field: 'rsi14', op: 'between', value: 50, value2: 30 }, 40)).toBe(true)
    expect(evaluateCondition({ id: '1', field: 'rsi14', op: 'between', value: 30, value2: 50 }, 51)).toBe(false)
    expect(evaluateCondition({ id: '1', field: 'rsi14', op: 'gt', value: 0 }, null)).toBe(false)
  })
})

describe('fieldValue', () => {
  it('reads ticker and metric fields in user units (percent for fractions)', () => {
    const t = ticker()
    const m = metrics()
    expect(fieldValue('vol7d', t, m)).toBeCloseTo(90)
    expect(fieldValue('volumeRatio', t, m)).toBeCloseTo(250)
    expect(fieldValue('volChange', t, m)).toBeCloseTo(18)
    expect(fieldValue('change24h', t, m)).toBe(6)
    expect(fieldValue('rsi14', t, m)).toBe(25)
    expect(fieldValue('vol7d', t, undefined)).toBeNull()
  })
})

describe('matchesScreen / runScreen', () => {
  const def: ScreenDefinition = {
    logic: 'and',
    conditions: [
      { id: 'a', field: 'vol7d', op: 'gt', value: 60 },
      { id: 'b', field: 'volumeRatio', op: 'gt', value: 100 },
      { id: 'c', field: 'rsi14', op: 'between', value: 20, value2: 50 }
    ]
  }
  it('requires all conditions with AND and any with OR', () => {
    expect(matchesScreen(def, ticker(), metrics())).toBe(true)
    expect(matchesScreen(def, ticker(), metrics({ rsi14: 60 }))).toBe(false)
    expect(matchesScreen({ ...def, logic: 'or' }, ticker(), metrics({ rsi14: 60 }))).toBe(true)
    expect(matchesScreen({ ...def, logic: 'or' }, ticker(), metrics({ rsi14: 60, vol7d: 0.1, volumeRatio: 0.5 }))).toBe(false)
  })
  it('matches everything with no conditions and excludes assets missing metrics', () => {
    expect(matchesScreen({ logic: 'and', conditions: [] }, ticker(), undefined)).toBe(true)
    expect(matchesScreen(def, ticker(), undefined)).toBe(false)
  })
  it('runs across a universe', () => {
    const list = [ticker({ assetId: 'a' }), ticker({ assetId: 'b' })]
    const out = runScreen(def, list, { a: metrics({ assetId: 'a' }), b: metrics({ assetId: 'b', vol7d: 0.2 }) })
    expect(out.map((t) => t.assetId)).toEqual(['a'])
  })
})

describe('presets', () => {
  it('have valid definitions and readable descriptions', () => {
    for (const p of SCREEN_PRESETS) {
      expect(p.definition.conditions.length).toBeGreaterThan(0)
      expect(describeScreen(p.definition)).toContain(p.definition.logic === 'and' ? 'AND' : 'OR')
    }
    const momentum = SCREEN_PRESETS.find((p) => p.name === 'Momentum')!
    expect(momentum.definition.conditions.find((c) => c.field === 'rsi14')?.value2).toBe(70)
  })
  it('Oversold matches an RSI 25 asset and not an RSI 55 one', () => {
    const oversold = SCREEN_PRESETS.find((p) => p.name === 'Oversold')!.definition
    expect(matchesScreen(oversold, ticker(), metrics({ rsi14: 25 }))).toBe(true)
    expect(matchesScreen(oversold, ticker(), metrics({ rsi14: 55 }))).toBe(false)
  })
})
