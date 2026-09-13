import { describe, it, expect } from 'vitest'
import { deriveHoldings, valueHoldings } from '../shared/analysis/portfolio'
import type { Ticker, Transaction } from '../shared/types'

let id = 0
const tx = (over: Partial<Transaction>): Transaction => ({
  id: ++id, portfolioId: 1, assetId: 'bitcoin', symbol: 'BTC', type: 'buy', quantity: 1, price: 100, fee: 0, timestamp: id * 1000, notes: '', ...over
})
const ticker = (assetId: string, price: number, change24hPct: number | null = null): Ticker => ({
  assetId, symbol: assetId.toUpperCase(), name: assetId, rank: null, imageUrl: null, price, change1hPct: null, change24hPct, change7dPct: null, change30dPct: null,
  marketCap: null, volume24h: null, high24h: null, low24h: null, circulatingSupply: null, ath: null, athDate: null, updatedAt: 0
})

describe('deriveHoldings', () => {
  it('computes weighted-average cost across buys including fees', () => {
    const [h] = deriveHoldings([tx({ quantity: 1, price: 100, fee: 2 }), tx({ quantity: 1, price: 200, fee: 0 })])
    expect(h!.quantity).toBe(2)
    expect(h!.costBasis).toBe(302)
    expect(h!.averageCost).toBe(151)
    expect(h!.fees).toBe(2)
  })

  it('realises P&L on sells at average cost and reduces basis', () => {
    const [h] = deriveHoldings([tx({ quantity: 2, price: 100 }), tx({ type: 'sell', quantity: 1, price: 150, fee: 1 })])
    expect(h!.quantity).toBe(1)
    expect(h!.costBasis).toBe(100)
    expect(h!.realizedPnl).toBe(49) // (150-100)*1 - 1
  })

  it('never sells more than held and zeroes out dust', () => {
    const [h] = deriveHoldings([tx({ quantity: 1, price: 100 }), tx({ type: 'sell', quantity: 5, price: 120 })])
    expect(h!.quantity).toBe(0)
    expect(h!.costBasis).toBe(0)
    expect(h!.realizedPnl).toBe(20)
  })

  it('treats deposits at zero price as zero-cost inventory and withdrawals without price as non-taxable removal', () => {
    const [h] = deriveHoldings([tx({ type: 'deposit', quantity: 2, price: 0 }), tx({ type: 'buy', quantity: 2, price: 50 }), tx({ type: 'withdrawal', quantity: 1, price: 0, fee: 0.5 })])
    // avg = 100/4 = 25 ; withdrawal removes 1 @ 25 basis, realises only -fee
    expect(h!.quantity).toBe(3)
    expect(h!.costBasis).toBeCloseTo(75, 10)
    expect(h!.realizedPnl).toBe(-0.5)
  })

  it('orders by timestamp regardless of insertion order', () => {
    const later = tx({ type: 'sell', quantity: 1, price: 200, timestamp: 5000 })
    const earlier = tx({ quantity: 1, price: 100, timestamp: 1000 })
    const [h] = deriveHoldings([later, earlier])
    expect(h!.realizedPnl).toBe(100)
  })

  it('keeps assets separate', () => {
    const hs = deriveHoldings([tx({ assetId: 'bitcoin' }), tx({ assetId: 'ethereum', symbol: 'ETH', price: 10 })])
    expect(hs.map((h) => h.assetId).sort()).toEqual(['bitcoin', 'ethereum'])
  })
})

describe('valueHoldings', () => {
  it('prices holdings, computes allocation, unrealised and daily P&L', () => {
    const holdings = deriveHoldings([tx({ assetId: 'bitcoin', quantity: 1, price: 100 }), tx({ assetId: 'ethereum', symbol: 'ETH', quantity: 10, price: 10 })])
    const { holdings: v, summary } = valueHoldings(holdings, { bitcoin: ticker('bitcoin', 300, 10), ethereum: ticker('ethereum', 5, -50) })
    const btc = v.find((h) => h.assetId === 'bitcoin')!
    const eth = v.find((h) => h.assetId === 'ethereum')!
    expect(btc.value).toBe(300)
    expect(btc.unrealizedPnl).toBe(200)
    expect(btc.unrealizedPnlPct).toBe(200)
    expect(eth.value).toBe(50)
    expect(eth.unrealizedPnl).toBe(-50)
    expect(summary.totalValue).toBe(350)
    expect(summary.totalCost).toBe(200)
    expect(summary.unrealizedPnl).toBe(150)
    expect(summary.unrealizedPnlPct).toBe(75)
    expect(btc.allocationPct).toBeCloseTo((300 / 350) * 100, 10)
    // BTC +10%: value 300 -> yesterday 272.73 -> daily +27.27 ; ETH -50%: 50 -> yesterday 100 -> -50
    expect(btc.dailyPnl).toBeCloseTo(300 - 300 / 1.1, 10)
    expect(eth.dailyPnl).toBeCloseTo(-50, 10)
    expect(summary.dailyPnl).toBeCloseTo(300 - 300 / 1.1 - 50, 10)
  })

  it('excludes unpriced assets from totals and lists them', () => {
    const holdings = deriveHoldings([tx({ assetId: 'bitcoin', quantity: 1, price: 100 }), tx({ assetId: 'unknown', symbol: 'UNK', quantity: 1, price: 50 })])
    const { summary } = valueHoldings(holdings, { bitcoin: ticker('bitcoin', 120) })
    expect(summary.totalValue).toBe(120)
    expect(summary.unrealizedPnl).toBe(20)
    expect(summary.unpriced).toEqual(['UNK'])
  })
})
