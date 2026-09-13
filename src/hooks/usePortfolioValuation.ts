import { useMemo } from 'react'
import type { PortfolioSummary, ValuedHolding } from '@shared/types'
import { deriveHoldings, valueHoldings } from '@shared/analysis/portfolio'
import { usePortfolioStore } from '@/stores/portfolioStore'
import { useMarketStore } from '@/stores/marketStore'

export interface Valuation {
  holdings: ValuedHolding[]
  open: ValuedHolding[]
  summary: PortfolioSummary
  transactionCount: number
}

/** Derives priced holdings for one portfolio (or all when `portfolioId` is null). Memoised on transactions + prices. */
export function usePortfolioValuation(portfolioId: number | null): Valuation {
  const transactions = usePortfolioStore((s) => s.transactions)
  const byId = useMarketStore((s) => s.byId)
  return useMemo(() => {
    const txs = portfolioId == null ? Object.values(transactions).flat() : (transactions[portfolioId] ?? [])
    const { holdings, summary } = valueHoldings(deriveHoldings(txs), byId)
    return { holdings, open: holdings.filter((h) => h.quantity > 0), summary, transactionCount: txs.length }
  }, [transactions, byId, portfolioId])
}
