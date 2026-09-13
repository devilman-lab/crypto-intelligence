import { describe, it, expect } from 'vitest'
import { conditionMet, describeRule, evaluateRule, observedValue } from '../shared/analysis/alerts'
import type { AlertRule, AssetMetrics, Ticker } from '../shared/types'

const ticker = (price: number, change24hPct: number | null = null): Ticker => ({ assetId: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', rank: 1, imageUrl: null, price, change1hPct: null, change24hPct, change7dPct: null, change30dPct: null, marketCap: null, volume24h: null, high24h: null, low24h: null, circulatingSupply: null, ath: null, athDate: null, updatedAt: 0 })
const metrics = (over: Partial<AssetMetrics> = {}): AssetMetrics => ({ assetId: 'bitcoin', symbol: 'BTC', vol24h: null, vol7d: 0.85, vol30d: null, volPercentile: null, volChange: null, atrPct: null, rsi14: 28, bbPercentB: null, vsSma50Pct: null, vsSma200Pct: null, macdHist: null, volumeRatio: 2.3, history: 100, source: 'daily', computedAt: 0, ...over })
const rule = (over: Partial<AlertRule> = {}): AlertRule => ({ id: 1, assetId: 'bitcoin', symbol: 'BTC', kind: 'price', direction: 'above', threshold: 100, mode: 'once', enabled: true, armed: false, lastTriggeredAt: null, triggerCount: 0, note: '', createdAt: 0, ...over })

describe('observedValue / conditionMet', () => {
  it('maps each kind to its unit', () => {
    expect(observedValue('price', ticker(123), undefined)).toBe(123)
    expect(observedValue('change24h', ticker(1, -6.5), undefined)).toBe(-6.5)
    expect(observedValue('volatility', undefined, metrics())).toBeCloseTo(85)
    expect(observedValue('volume', undefined, metrics())).toBeCloseTo(230)
    expect(observedValue('rsi', undefined, metrics())).toBe(28)
    expect(observedValue('rsi', undefined, undefined)).toBeNull()
  })
  it('compares strictly and ignores nulls', () => {
    expect(conditionMet({ direction: 'above', threshold: 100 }, 100.01)).toBe(true)
    expect(conditionMet({ direction: 'above', threshold: 100 }, 100)).toBe(false)
    expect(conditionMet({ direction: 'below', threshold: 30 }, 29)).toBe(true)
    expect(conditionMet({ direction: 'below', threshold: 30 }, null)).toBe(false)
  })
})

describe('evaluateRule', () => {
  it('fires on the false→true edge and disables a once rule', () => {
    const r = evaluateRule(rule(), ticker(120), undefined, 1000)
    expect(r.fired?.value).toBe(120)
    expect(r.fired?.message).toContain('BTC Price > $100')
    expect(r.rule.enabled).toBe(false)
    expect(r.rule.armed).toBe(true)
    expect(r.rule.triggerCount).toBe(1)
    expect(r.rule.lastTriggeredAt).toBe(1000)
  })
  it('does not re-fire while the condition stays true, re-arms when it clears (repeating)', () => {
    const first = evaluateRule(rule({ mode: 'repeating' }), ticker(120), undefined, 1)
    expect(first.fired).not.toBeNull()
    expect(first.rule.enabled).toBe(true)
    const still = evaluateRule(first.rule, ticker(130), undefined, 2)
    expect(still.fired).toBeNull()
    expect(still.changed).toBe(false)
    const cleared = evaluateRule(still.rule, ticker(90), undefined, 3)
    expect(cleared.fired).toBeNull()
    expect(cleared.rule.armed).toBe(false)
    const again = evaluateRule(cleared.rule, ticker(101), undefined, 4)
    expect(again.fired).not.toBeNull()
    expect(again.rule.triggerCount).toBe(2)
  })
  it('ignores disabled rules and missing data', () => {
    expect(evaluateRule(rule({ enabled: false }), ticker(999), undefined, 1).fired).toBeNull()
    expect(evaluateRule(rule({ kind: 'rsi', direction: 'below', threshold: 30 }), ticker(1), undefined, 1).fired).toBeNull()
    expect(evaluateRule(rule({ kind: 'rsi', direction: 'below', threshold: 30 }), ticker(1), metrics({ rsi14: 25 }), 1).fired?.value).toBe(25)
  })
})

describe('describeRule', () => {
  it('formats each kind readably', () => {
    expect(describeRule(rule({ kind: 'price', threshold: 120000 }))).toBe('BTC Price > $120,000')
    expect(describeRule(rule({ kind: 'volatility', threshold: 80 }))).toBe('BTC Volatility (7d) > 80%')
    expect(describeRule(rule({ kind: 'rsi', direction: 'below', threshold: 30 }))).toBe('BTC RSI (14, daily) < 30')
    expect(describeRule(rule({ kind: 'volume', threshold: 200 }))).toBe('BTC Volume vs 30d avg > 200%')
  })
})
