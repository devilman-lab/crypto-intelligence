/**
 * Trading-journal calculations (pure).
 *   pnl (long)  = q · (exit − entry) − fees
 *   pnl (short) = q · (entry − exit) − fees
 * Result is derived from pnl unless the entry is still open.
 */
import type { JournalEntry, JournalEntryInput, JournalFilter, JournalResult, JournalStats } from '../types'

const BREAKEVEN_EPS = 1e-9

export function journalPnl(e: Pick<JournalEntryInput, 'side' | 'entryPrice' | 'exitPrice' | 'quantity' | 'fees'>): number | null {
  if (e.exitPrice == null) return null
  const gross = e.side === 'long' ? e.quantity * (e.exitPrice - e.entryPrice) : e.quantity * (e.entryPrice - e.exitPrice)
  return gross - e.fees
}

export function journalResult(pnl: number | null): JournalResult {
  if (pnl == null) return 'open'
  if (Math.abs(pnl) <= BREAKEVEN_EPS) return 'breakeven'
  return pnl > 0 ? 'win' : 'loss'
}

export function filterEntries(entries: readonly JournalEntry[], f: JournalFilter): JournalEntry[] {
  const q = f.search?.trim().toLowerCase()
  return entries.filter((e) => {
    if (f.assetId && e.assetId !== f.assetId) return false
    if (f.strategy && e.strategy !== f.strategy) return false
    if (f.side && e.side !== f.side) return false
    if (f.result && e.result !== f.result) return false
    if (f.from != null && e.openedAt < f.from) return false
    if (f.to != null && e.openedAt > f.to) return false
    if (q && ![e.symbol, e.strategy, e.entryReason, e.exitReason, e.notes, e.tags.join(' ')].some((s) => s.toLowerCase().includes(q))) return false
    return true
  })
}

export function journalStats(entries: readonly JournalEntry[]): JournalStats {
  const closed = entries.filter((e): e is JournalEntry & { pnl: number } => e.pnl != null).sort((a, b) => (a.closedAt ?? a.openedAt) - (b.closedAt ?? b.openedAt) || a.id - b.id)
  const wins = closed.filter((e) => e.result === 'win')
  const losses = closed.filter((e) => e.result === 'loss')
  const grossProfit = wins.reduce((s, e) => s + e.pnl, 0)
  const grossLoss = -losses.reduce((s, e) => s + e.pnl, 0)
  let cum = 0
  let peak = 0
  let maxDd = 0
  for (const e of closed) {
    cum += e.pnl
    if (cum > peak) peak = cum
    maxDd = Math.max(maxDd, peak - cum)
  }
  const winRate = closed.length ? wins.length / closed.length : null
  const avgWin = wins.length ? grossProfit / wins.length : null
  const avgLoss = losses.length ? -grossLoss / losses.length : null
  return {
    entries: entries.length,
    closed: closed.length,
    wins: wins.length,
    losses: losses.length,
    breakeven: closed.filter((e) => e.result === 'breakeven').length,
    winRatePct: winRate == null ? null : winRate * 100,
    totalPnl: closed.reduce((s, e) => s + e.pnl, 0),
    averageWin: avgWin,
    averageLoss: avgLoss,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : wins.length ? Infinity : null,
    bestTrade: closed.length ? Math.max(...closed.map((e) => e.pnl)) : null,
    worstTrade: closed.length ? Math.min(...closed.map((e) => e.pnl)) : null,
    maxDrawdown: closed.length ? maxDd : null,
    // Expectancy per trade = winRate·avgWin + (1 − winRate)·avgLoss  (avgLoss is negative)
    expectancy: winRate == null ? null : winRate * (avgWin ?? 0) + (1 - winRate) * (avgLoss ?? 0),
    totalFees: entries.reduce((s, e) => s + e.fees, 0)
  }
}
