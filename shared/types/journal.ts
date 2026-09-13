export type JournalSide = 'long' | 'short'
export type JournalResult = 'win' | 'loss' | 'breakeven' | 'open'
export type JournalEmotion = 'calm' | 'confident' | 'anxious' | 'fomo' | 'greedy' | 'fearful' | 'bored' | 'revenge' | 'neutral'

export const JOURNAL_EMOTIONS: readonly JournalEmotion[] = ['neutral', 'calm', 'confident', 'anxious', 'fomo', 'greedy', 'fearful', 'bored', 'revenge']

export interface JournalEntry {
  id: number
  assetId: string
  symbol: string
  side: JournalSide
  entryPrice: number
  /** Null while the trade is still open. */
  exitPrice: number | null
  /** Position size in asset units. */
  quantity: number
  fees: number
  strategy: string
  entryReason: string
  exitReason: string
  result: JournalResult
  emotion: JournalEmotion
  notes: string
  /** Optional path to a screenshot on the user's disk (never read by the app). */
  screenshotPath: string
  tags: string[]
  /** Unix ms. */
  openedAt: number
  closedAt: number | null
  createdAt: number
  updatedAt: number
  /** Net P&L in USD, derived from prices/size/fees when closed; stored for filtering and stats. */
  pnl: number | null
}

export type JournalEntryInput = Omit<JournalEntry, 'id' | 'symbol' | 'createdAt' | 'updatedAt' | 'pnl' | 'result'> & { result?: JournalResult }

export interface JournalFilter {
  assetId?: string
  strategy?: string
  side?: JournalSide
  result?: JournalResult
  from?: number
  to?: number
  search?: string
}

export interface JournalStats {
  entries: number
  closed: number
  wins: number
  losses: number
  breakeven: number
  winRatePct: number | null
  totalPnl: number
  averageWin: number | null
  averageLoss: number | null
  profitFactor: number | null
  bestTrade: number | null
  worstTrade: number | null
  /** Largest peak-to-trough drawdown of cumulative P&L, in USD. */
  maxDrawdown: number | null
  expectancy: number | null
  totalFees: number
}
