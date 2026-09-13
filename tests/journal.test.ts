import { describe, it, expect } from 'vitest'
import { filterEntries, journalPnl, journalResult, journalStats } from '../shared/analysis/journal'
import type { JournalEntry } from '../shared/types'

let seq = 0
const entry = (over: Partial<JournalEntry>): JournalEntry => {
  const base: JournalEntry = {
    id: ++seq, assetId: 'bitcoin', symbol: 'BTC', side: 'long', entryPrice: 100, exitPrice: 110, quantity: 1, fees: 0, strategy: 'Breakout', entryReason: '', exitReason: '',
    result: 'win', emotion: 'calm', notes: '', screenshotPath: '', tags: [], openedAt: seq * 1000, closedAt: seq * 1000 + 500, createdAt: 0, updatedAt: 0, pnl: 10, ...over
  }
  return base
}

describe('journalPnl / journalResult', () => {
  it('computes long and short P&L net of fees', () => {
    expect(journalPnl({ side: 'long', entryPrice: 100, exitPrice: 110, quantity: 2, fees: 1 })).toBe(19)
    expect(journalPnl({ side: 'short', entryPrice: 100, exitPrice: 110, quantity: 2, fees: 1 })).toBe(-21)
    expect(journalPnl({ side: 'long', entryPrice: 100, exitPrice: null, quantity: 2, fees: 1 })).toBeNull()
  })
  it('derives the result', () => {
    expect(journalResult(5)).toBe('win')
    expect(journalResult(-5)).toBe('loss')
    expect(journalResult(0)).toBe('breakeven')
    expect(journalResult(null)).toBe('open')
  })
})

describe('filterEntries', () => {
  const list = [entry({ assetId: 'bitcoin', strategy: 'Breakout', side: 'long', result: 'win', openedAt: 1000, notes: 'clean setup' }), entry({ assetId: 'ethereum', symbol: 'ETH', strategy: 'Mean reversion', side: 'short', result: 'loss', openedAt: 5000, pnl: -5 })]
  it('applies every filter dimension', () => {
    expect(filterEntries(list, { assetId: 'ethereum' })).toHaveLength(1)
    expect(filterEntries(list, { strategy: 'Breakout' })[0]?.assetId).toBe('bitcoin')
    expect(filterEntries(list, { side: 'short' })).toHaveLength(1)
    expect(filterEntries(list, { result: 'loss' })).toHaveLength(1)
    expect(filterEntries(list, { from: 2000 })).toHaveLength(1)
    expect(filterEntries(list, { to: 2000 })).toHaveLength(1)
    expect(filterEntries(list, { search: 'CLEAN' })).toHaveLength(1)
    expect(filterEntries(list, {})).toHaveLength(2)
  })
})

describe('journalStats', () => {
  it('computes win rate, averages, profit factor, drawdown and expectancy', () => {
    const list = [entry({ pnl: 100, result: 'win' }), entry({ pnl: -40, result: 'loss' }), entry({ pnl: -80, result: 'loss' }), entry({ pnl: 60, result: 'win' }), entry({ pnl: null, exitPrice: null, result: 'open', closedAt: null }), entry({ pnl: 0, result: 'breakeven' })]
    const s = journalStats(list)
    expect(s.entries).toBe(6)
    expect(s.closed).toBe(5)
    expect(s.wins).toBe(2)
    expect(s.losses).toBe(2)
    expect(s.breakeven).toBe(1)
    expect(s.winRatePct).toBe(40)
    expect(s.totalPnl).toBe(40)
    expect(s.averageWin).toBe(80)
    expect(s.averageLoss).toBe(-60)
    expect(s.profitFactor).toBeCloseTo(160 / 120, 10)
    expect(s.bestTrade).toBe(100)
    expect(s.worstTrade).toBe(-80)
    // cumulative: 100 (peak) -> 60 -> -20 -> 40 -> 40 ; max dd = 120
    expect(s.maxDrawdown).toBe(120)
    expect(s.expectancy).toBeCloseTo(0.4 * 80 + 0.6 * -60, 10)
  })
  it('handles no closed trades', () => {
    const s = journalStats([entry({ pnl: null, exitPrice: null, result: 'open' })])
    expect(s.winRatePct).toBeNull()
    expect(s.maxDrawdown).toBeNull()
    expect(s.expectancy).toBeNull()
  })
})
