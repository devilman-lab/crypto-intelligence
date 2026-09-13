export type PaperSide = 'long' | 'short'

export interface PaperAccount {
  id: number
  name: string
  startingBalance: number
  /** Free cash in USD. */
  cash: number
  /** Fee applied to every fill, as a fraction (0.001 = 0.1%). */
  feeRate: number
  createdAt: number
  /** Unix ms of the last reset. */
  resetAt: number
}

export interface PaperPosition {
  id: number
  accountId: number
  assetId: string
  symbol: string
  side: PaperSide
  quantity: number
  /** Average entry price, USD. */
  entryPrice: number
  /** Fees paid on entry, USD. */
  entryFees: number
  openedAt: number
}

/** A completed round trip (or partial close). */
export interface PaperTrade {
  id: number
  accountId: number
  assetId: string
  symbol: string
  side: PaperSide
  quantity: number
  entryPrice: number
  exitPrice: number
  fees: number
  /** Net P&L in USD after fees. */
  pnl: number
  /** Net return on the position's notional entry value, in percent. */
  roiPct: number
  openedAt: number
  closedAt: number
}

export interface PaperOrderInput {
  accountId: number
  assetId: string
  side: PaperSide
  /** Quantity in asset units. */
  quantity: number
}

export interface PaperCloseInput {
  positionId: number
  /** Quantity to close; omit to close the whole position. */
  quantity?: number
}

export interface PaperStats {
  trades: number
  wins: number
  losses: number
  winRatePct: number | null
  totalPnl: number
  averageWin: number | null
  averageLoss: number | null
  /** Gross profit / gross loss. */
  profitFactor: number | null
  bestTrade: number | null
  worstTrade: number | null
  /** Largest peak-to-trough decline of cumulative realised P&L relative to the starting balance, in percent. */
  maxDrawdownPct: number | null
  totalFees: number
}

export interface PaperSnapshot {
  account: PaperAccount
  positions: PaperPosition[]
  trades: PaperTrade[]
}
