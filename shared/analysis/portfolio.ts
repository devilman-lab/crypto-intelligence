/**
 * Portfolio accounting.
 *
 * Holdings are derived from the transaction log using the weighted-average
 * cost method:
 *   buy / deposit  → quantity += q ; costBasis += q·price + fee
 *   sell / withdraw→ realised += q·(price − avgCost) − fee ; costBasis −= q·avgCost ; quantity −= q
 * A deposit with price 0 adds quantity at zero cost (e.g. transferred-in
 * coins with unknown basis); a withdrawal removes quantity at average cost
 * without realising P&L unless a price is given.
 */
import type { Holding, PortfolioSummary, Ticker, Transaction, ValuedHolding } from '../types'

const EPS = 1e-12

export function deriveHoldings(transactions: readonly Transaction[]): Holding[] {
  const sorted = [...transactions].sort((a, b) => a.timestamp - b.timestamp || a.id - b.id)
  const map = new Map<string, Holding>()
  for (const tx of sorted) {
    const h = map.get(tx.assetId) ?? { assetId: tx.assetId, symbol: tx.symbol, quantity: 0, costBasis: 0, averageCost: 0, realizedPnl: 0, fees: 0 }
    const q = Math.max(0, tx.quantity)
    const price = Math.max(0, tx.price)
    const fee = Math.max(0, tx.fee)
    h.fees += fee
    if (tx.type === 'buy' || tx.type === 'deposit') {
      h.quantity += q
      h.costBasis += q * price + fee
    } else {
      const sellQty = Math.min(q, h.quantity)
      const avg = h.quantity > EPS ? h.costBasis / h.quantity : 0
      if (tx.type === 'sell' || price > 0) h.realizedPnl += sellQty * (price - avg) - fee
      else h.realizedPnl -= fee
      h.costBasis -= sellQty * avg
      h.quantity -= sellQty
      if (h.quantity < EPS) {
        h.quantity = 0
        h.costBasis = 0
      }
    }
    h.averageCost = h.quantity > EPS ? h.costBasis / h.quantity : 0
    map.set(tx.assetId, h)
  }
  return [...map.values()]
}

export function valueHoldings(holdings: readonly Holding[], prices: Record<string, Ticker | undefined>): { holdings: ValuedHolding[]; summary: PortfolioSummary } {
  const valued: ValuedHolding[] = holdings.map((h) => {
    const t = prices[h.assetId]
    const price = t?.price ?? null
    const value = price != null ? h.quantity * price : null
    const unrealizedPnl = value != null ? value - h.costBasis : null
    const change = t?.change24hPct ?? null
    // Value 24h ago = value / (1 + change) ; daily P&L = value − value_24h_ago
    const dailyPnl = value != null && change != null && change > -100 ? value - value / (1 + change / 100) : null
    return {
      ...h,
      price,
      value,
      unrealizedPnl,
      unrealizedPnlPct: unrealizedPnl != null && h.costBasis > 0 ? (unrealizedPnl / h.costBasis) * 100 : null,
      allocationPct: null,
      dailyPnl,
      change24hPct: change
    }
  })

  const open = valued.filter((h) => h.quantity > EPS)
  const totalValue = open.reduce((s, h) => s + (h.value ?? 0), 0)
  const pricedCost = open.filter((h) => h.value != null).reduce((s, h) => s + h.costBasis, 0)
  const totalCost = open.reduce((s, h) => s + h.costBasis, 0)
  for (const h of open) h.allocationPct = totalValue > 0 && h.value != null ? (h.value / totalValue) * 100 : null
  const unrealizedPnl = totalValue - pricedCost
  const dailyPnl = open.reduce((s, h) => s + (h.dailyPnl ?? 0), 0)
  const valueYesterday = totalValue - dailyPnl

  return {
    holdings: valued,
    summary: {
      totalValue,
      totalCost,
      unrealizedPnl,
      unrealizedPnlPct: pricedCost > 0 ? (unrealizedPnl / pricedCost) * 100 : null,
      realizedPnl: valued.reduce((s, h) => s + h.realizedPnl, 0),
      dailyPnl,
      dailyPnlPct: valueYesterday > 0 ? (dailyPnl / valueYesterday) * 100 : null,
      fees: valued.reduce((s, h) => s + h.fees, 0),
      unpriced: open.filter((h) => h.value == null).map((h) => h.symbol)
    }
  }
}
