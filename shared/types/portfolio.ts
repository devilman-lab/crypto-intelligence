export type TransactionType = 'buy' | 'sell' | 'deposit' | 'withdrawal'

export interface Portfolio {
  id: number
  name: string
  createdAt: number
}

export interface Transaction {
  id: number
  portfolioId: number
  assetId: string
  symbol: string
  type: TransactionType
  quantity: number
  /** Price per unit in USD (0 for deposits/withdrawals of the asset itself). */
  price: number
  /** Fee in USD. */
  fee: number
  /** Unix ms. */
  timestamp: number
  notes: string
}

export type TransactionInput = Omit<Transaction, 'id' | 'symbol'>

/** Position derived from transactions (before pricing). */
export interface Holding {
  assetId: string
  symbol: string
  quantity: number
  /** Total cost of the open quantity, USD (weighted average method). */
  costBasis: number
  /** Average cost per unit, USD. */
  averageCost: number
  /** Realised P&L from sells, USD. */
  realizedPnl: number
  /** Total fees paid, USD. */
  fees: number
}

/** Holding priced with a live ticker. */
export interface ValuedHolding extends Holding {
  price: number | null
  value: number | null
  unrealizedPnl: number | null
  unrealizedPnlPct: number | null
  /** Share of total portfolio value, 0–100. */
  allocationPct: number | null
  /** Value change over the last 24h implied by the ticker's 24h % change. */
  dailyPnl: number | null
  change24hPct: number | null
}

export interface PortfolioSummary {
  totalValue: number
  totalCost: number
  unrealizedPnl: number
  unrealizedPnlPct: number | null
  realizedPnl: number
  dailyPnl: number
  dailyPnlPct: number | null
  fees: number
  /** Assets without a live price (their value is excluded from totals). */
  unpriced: string[]
}
