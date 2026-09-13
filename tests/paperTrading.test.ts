import { describe, it, expect } from 'vitest'
import { accountEquity, closePosition, computeStats, openPosition, unrealizedPnl } from '../shared/analysis/paperTrading'
import type { PaperPosition, PaperTrade, Ticker } from '../shared/types'

const pos = (over: Partial<PaperPosition> = {}): PaperPosition => ({ id: 1, accountId: 1, assetId: 'bitcoin', symbol: 'BTC', side: 'long', quantity: 1, entryPrice: 100, entryFees: 0.1, openedAt: 0, ...over })
const ticker = (price: number): Ticker => ({ assetId: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', rank: 1, imageUrl: null, price, change1hPct: null, change24hPct: null, change7dPct: null, change30dPct: null, marketCap: null, volume24h: null, high24h: null, low24h: null, circulatingSupply: null, ath: null, athDate: null, updatedAt: 0 })

describe('openPosition', () => {
  it('deducts notional plus fee and records average entry', () => {
    const r = openPosition(10_000, 0.001, { assetId: 'bitcoin', symbol: 'BTC', side: 'long', quantity: 2, price: 100, now: 5 })
    expect(r.fee).toBeCloseTo(0.2, 10)
    expect(r.cash).toBeCloseTo(10_000 - 200 - 0.2, 10)
    expect(r.position.entryPrice).toBe(100)
    expect(r.position.quantity).toBe(2)
  })
  it('averages into an existing same-side position', () => {
    const r = openPosition(10_000, 0, { assetId: 'bitcoin', symbol: 'BTC', side: 'long', quantity: 1, price: 200, now: 5 }, pos({ quantity: 1, entryPrice: 100 }))
    expect(r.position.quantity).toBe(2)
    expect(r.position.entryPrice).toBe(150)
  })
  it('rejects insufficient cash and opposite-side stacking', () => {
    expect(() => openPosition(100, 0.001, { assetId: 'bitcoin', symbol: 'BTC', side: 'long', quantity: 1, price: 100, now: 0 })).toThrow(/insufficient/i)
    expect(() => openPosition(10_000, 0, { assetId: 'bitcoin', symbol: 'BTC', side: 'short', quantity: 1, price: 100, now: 0 }, pos())).toThrow(/opposite/i)
  })
})

describe('closePosition', () => {
  it('realises long P&L net of exit fee and the share of entry fees', () => {
    const r = closePosition(0, 0.001, pos({ quantity: 2, entryPrice: 100, entryFees: 0.2 }), undefined, 110, 9)
    // gross 20, exit fee 0.22, entry fee share 0.2 -> pnl 19.58 ; proceeds 220 - 0.22
    expect(r.trade.pnl).toBeCloseTo(19.58, 10)
    expect(r.cash).toBeCloseTo(219.78, 10)
    expect(r.remaining).toBeNull()
    expect(r.trade.roiPct).toBeCloseTo((19.58 / 200) * 100, 10)
  })
  it('supports partial closes and keeps proportional entry fees', () => {
    const r = closePosition(0, 0, pos({ quantity: 4, entryPrice: 100, entryFees: 1 }), 1, 90, 9)
    expect(r.trade.pnl).toBeCloseTo(-10 - 0.25, 10)
    expect(r.remaining?.quantity).toBe(3)
    expect(r.remaining?.entryFees).toBeCloseTo(0.75, 10)
  })
  it('realises short P&L and returns collateral', () => {
    // short 1 @ 100 with 100 collateral posted; close @ 80 -> gross +20 ; proceeds = 100 + 20
    const r = closePosition(0, 0, pos({ side: 'short', quantity: 1, entryPrice: 100, entryFees: 0 }), undefined, 80, 9)
    expect(r.trade.pnl).toBe(20)
    expect(r.cash).toBe(120)
    const loss = closePosition(0, 0, pos({ side: 'short', quantity: 1, entryPrice: 100, entryFees: 0 }), undefined, 130, 9)
    expect(loss.trade.pnl).toBe(-30)
    expect(loss.cash).toBe(70)
  })
  it('round-trips cash for a short: open then close at the same price loses only fees', () => {
    const o = openPosition(1000, 0.001, { assetId: 'bitcoin', symbol: 'BTC', side: 'short', quantity: 1, price: 100, now: 0 })
    const c = closePosition(o.cash, 0.001, { ...o.position, id: 1, accountId: 1 }, undefined, 100, 1)
    expect(c.cash).toBeCloseTo(1000 - 0.2, 10)
    expect(c.trade.pnl).toBeCloseTo(-0.2, 10)
  })
})

describe('unrealizedPnl / accountEquity', () => {
  it('values longs and shorts against live prices', () => {
    expect(unrealizedPnl(pos({ side: 'long', quantity: 2, entryPrice: 100 }), 110)).toBe(20)
    expect(unrealizedPnl(pos({ side: 'short', quantity: 2, entryPrice: 100 }), 110)).toBe(-20)
    const eq = accountEquity({ cash: 500 }, [pos({ side: 'long', quantity: 1, entryPrice: 100 }), pos({ id: 2, side: 'short', quantity: 1, entryPrice: 100 })], { bitcoin: ticker(120) })
    // long worth 120 ; short: 100 collateral - 20 = 80 ; total 500 + 200
    expect(eq.equity).toBe(700)
    expect(eq.unrealized).toBe(0)
  })
  it('falls back to entry valuation when unpriced', () => {
    const eq = accountEquity({ cash: 0 }, [pos({ quantity: 1, entryPrice: 100 })], {})
    expect(eq.equity).toBe(100)
    expect(eq.unpriced).toEqual(['BTC'])
  })
})

describe('computeStats', () => {
  const t = (pnl: number, closedAt: number, fees = 0): PaperTrade => ({ id: closedAt, accountId: 1, assetId: 'x', symbol: 'X', side: 'long', quantity: 1, entryPrice: 1, exitPrice: 1, fees, pnl, roiPct: 0, openedAt: 0, closedAt })
  it('computes win rate, averages, profit factor and max drawdown', () => {
    const s = computeStats([t(100, 1), t(-50, 2), t(-70, 3), t(30, 4)], 1000)
    expect(s.trades).toBe(4)
    expect(s.wins).toBe(2)
    expect(s.winRatePct).toBe(50)
    expect(s.totalPnl).toBe(10)
    expect(s.averageWin).toBe(65)
    expect(s.averageLoss).toBe(-60)
    expect(s.profitFactor).toBeCloseTo(130 / 120, 10)
    expect(s.bestTrade).toBe(100)
    expect(s.worstTrade).toBe(-70)
    // equity: 1100 (peak) -> 1050 -> 980 -> 1010 ; max dd = (1100-980)/1100
    expect(s.maxDrawdownPct).toBeCloseTo((120 / 1100) * 100, 10)
  })
  it('handles empty and all-winning series', () => {
    expect(computeStats([], 1000).winRatePct).toBeNull()
    expect(computeStats([t(5, 1)], 1000).profitFactor).toBe(Infinity)
    expect(computeStats([t(5, 1)], 1000).maxDrawdownPct).toBe(0)
  })
})
