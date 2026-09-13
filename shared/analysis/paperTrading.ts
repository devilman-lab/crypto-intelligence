/**
 * Paper-trading engine (pure). Simulates spot longs and simple shorts.
 *
 * Long:  open  → cash −= q·p + fee ;  close → cash += q·p − fee ;  pnl = q·(exit − entry) − fees
 * Short: open  → cash −= fee, margin = q·p reserved (cash −= q·p as collateral)
 *        close → cash += 2·q·entry − q·exit − fee (collateral back + profit/loss)
 *        pnl = q·(entry − exit) − fees
 * Shorts are fully collateralised (no leverage) so equity can never go negative
 * on a long and losses on a short are capped by available cash in practice.
 * This is an educational simulation; it ignores slippage, funding and borrow costs.
 */
import type { PaperAccount, PaperPosition, PaperSide, PaperStats, PaperTrade, Ticker } from '../types'

const EPS = 1e-12

export function unrealizedPnl(p: Pick<PaperPosition, 'side' | 'quantity' | 'entryPrice'>, price: number): number {
  return p.side === 'long' ? p.quantity * (price - p.entryPrice) : p.quantity * (p.entryPrice - price)
}

export function positionValue(p: Pick<PaperPosition, 'side' | 'quantity' | 'entryPrice'>, price: number): number {
  // Long: market value. Short: collateral plus unrealised P&L.
  return p.side === 'long' ? p.quantity * price : p.quantity * p.entryPrice + unrealizedPnl(p, price)
}

export function accountEquity(account: Pick<PaperAccount, 'cash'>, positions: readonly PaperPosition[], prices: Record<string, Ticker | undefined>): { equity: number; unrealized: number; unpriced: string[] } {
  let equity = account.cash
  let unrealized = 0
  const unpriced: string[] = []
  for (const p of positions) {
    const price = prices[p.assetId]?.price
    if (price == null) {
      // Fall back to entry valuation so equity stays sane offline.
      equity += p.quantity * p.entryPrice
      unpriced.push(p.symbol)
      continue
    }
    equity += positionValue(p, price)
    unrealized += unrealizedPnl(p, price)
  }
  return { equity, unrealized, unpriced }
}

export interface OpenResult {
  cash: number
  position: Omit<PaperPosition, 'id' | 'accountId'>
  fee: number
}

/** Cost to open: notional + fee (both sides, since shorts post full collateral). */
export function openCost(quantity: number, price: number, feeRate: number): { notional: number; fee: number; total: number } {
  const notional = quantity * price
  const fee = notional * feeRate
  return { notional, fee, total: notional + fee }
}

export function openPosition(cash: number, feeRate: number, input: { assetId: string; symbol: string; side: PaperSide; quantity: number; price: number; now: number }, existing?: PaperPosition): OpenResult {
  if (!(input.quantity > 0) || !(input.price > 0)) throw new Error('Quantity and price must be positive.')
  const { fee, total } = openCost(input.quantity, input.price, feeRate)
  if (total > cash + EPS) throw new Error('Insufficient simulated cash for this order.')
  if (existing && existing.side !== input.side) throw new Error('Close the opposite position first.')
  const prevQty = existing?.quantity ?? 0
  const prevCost = existing ? existing.quantity * existing.entryPrice : 0
  const quantity = prevQty + input.quantity
  const entryPrice = (prevCost + input.quantity * input.price) / quantity
  return {
    cash: cash - total,
    fee,
    position: {
      assetId: input.assetId,
      symbol: input.symbol,
      side: input.side,
      quantity,
      entryPrice,
      entryFees: (existing?.entryFees ?? 0) + fee,
      openedAt: existing?.openedAt ?? input.now
    }
  }
}

export interface CloseResult {
  cash: number
  /** Remaining position or null if fully closed. */
  remaining: Omit<PaperPosition, 'id' | 'accountId'> | null
  trade: Omit<PaperTrade, 'id' | 'accountId'>
}

export function closePosition(cash: number, feeRate: number, position: PaperPosition, quantity: number | undefined, price: number, now: number): CloseResult {
  const q = Math.min(quantity ?? position.quantity, position.quantity)
  if (!(q > 0) || !(price > 0)) throw new Error('Quantity and price must be positive.')
  const exitFee = q * price * feeRate
  const share = q / position.quantity
  const entryFeeShare = position.entryFees * share
  const gross = position.side === 'long' ? q * (price - position.entryPrice) : q * (position.entryPrice - price)
  const pnl = gross - exitFee - entryFeeShare
  // Return collateral/notional plus P&L.
  const proceeds = position.side === 'long' ? q * price - exitFee : q * position.entryPrice + gross - exitFee
  const remainingQty = position.quantity - q
  return {
    cash: cash + proceeds,
    remaining:
      remainingQty > EPS
        ? { assetId: position.assetId, symbol: position.symbol, side: position.side, quantity: remainingQty, entryPrice: position.entryPrice, entryFees: position.entryFees - entryFeeShare, openedAt: position.openedAt }
        : null,
    trade: {
      assetId: position.assetId,
      symbol: position.symbol,
      side: position.side,
      quantity: q,
      entryPrice: position.entryPrice,
      exitPrice: price,
      fees: exitFee + entryFeeShare,
      pnl,
      roiPct: position.entryPrice > 0 ? (pnl / (q * position.entryPrice)) * 100 : 0,
      openedAt: position.openedAt,
      closedAt: now
    }
  }
}

/** Trade statistics. `trades` in any order; drawdown uses chronological cumulative P&L. */
export function computeStats(trades: readonly PaperTrade[], startingBalance: number): PaperStats {
  const sorted = [...trades].sort((a, b) => a.closedAt - b.closedAt || a.id - b.id)
  const wins = sorted.filter((t) => t.pnl > 0)
  const losses = sorted.filter((t) => t.pnl < 0)
  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0)
  const grossLoss = -losses.reduce((s, t) => s + t.pnl, 0)
  let peak = startingBalance
  let equity = startingBalance
  let maxDd = 0
  for (const t of sorted) {
    equity += t.pnl
    if (equity > peak) peak = equity
    if (peak > 0) maxDd = Math.max(maxDd, ((peak - equity) / peak) * 100)
  }
  return {
    trades: sorted.length,
    wins: wins.length,
    losses: losses.length,
    winRatePct: sorted.length ? (wins.length / sorted.length) * 100 : null,
    totalPnl: sorted.reduce((s, t) => s + t.pnl, 0),
    averageWin: wins.length ? grossProfit / wins.length : null,
    averageLoss: losses.length ? -grossLoss / losses.length : null,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : wins.length ? Infinity : null,
    bestTrade: sorted.length ? Math.max(...sorted.map((t) => t.pnl)) : null,
    worstTrade: sorted.length ? Math.min(...sorted.map((t) => t.pnl)) : null,
    maxDrawdownPct: sorted.length ? maxDd : null,
    totalFees: sorted.reduce((s, t) => s + t.fees, 0)
  }
}
