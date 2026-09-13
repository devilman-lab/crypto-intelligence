import { create } from 'zustand'
import type { Portfolio, Transaction, TransactionInput } from '@shared/types'
import { api, errorMessage } from '@/lib/api'

interface PortfolioState {
  portfolios: Portfolio[]
  activeId: number | null
  /** All transactions across portfolios (dashboard totals) keyed by portfolio id. */
  transactions: Record<number, Transaction[]>
  loaded: boolean
  error: string | null
  load: () => Promise<void>
  setActive: (id: number) => void
  create: (name: string) => Promise<void>
  rename: (id: number, name: string) => Promise<void>
  remove: (id: number) => Promise<void>
  addTransaction: (input: TransactionInput) => Promise<boolean>
  updateTransaction: (id: number, input: TransactionInput) => Promise<boolean>
  deleteTransaction: (portfolioId: number, id: number) => Promise<void>
}

const DEFAULT_NAME = 'Main'

function group(all: Transaction[]): Record<number, Transaction[]> {
  const out: Record<number, Transaction[]> = {}
  for (const t of all) (out[t.portfolioId] ??= []).push(t)
  return out
}

export const usePortfolioStore = create<PortfolioState>((set) => {
  const reloadTx = async () => set({ transactions: group(await api.portfolio.listAllTransactions()) })
  const guard = async (fn: () => Promise<void>): Promise<boolean> => {
    try {
      await fn()
      set({ error: null })
      return true
    } catch (err) {
      set({ error: errorMessage(err) })
      return false
    }
  }
  return {
    portfolios: [],
    activeId: null,
    transactions: {},
    loaded: false,
    error: null,
    load: async () => {
      try {
        let portfolios = await api.portfolio.list()
        if (portfolios.length === 0) portfolios = [await api.portfolio.create(DEFAULT_NAME)]
        const transactions = group(await api.portfolio.listAllTransactions())
        set((s) => ({ portfolios, transactions, loaded: true, error: null, activeId: s.activeId && portfolios.some((p) => p.id === s.activeId) ? s.activeId : (portfolios[0]?.id ?? null) }))
      } catch (err) {
        set({ loaded: true, error: errorMessage(err) })
      }
    },
    setActive: (id) => set({ activeId: id }),
    create: async (name) => {
      await guard(async () => {
        const p = await api.portfolio.create(name)
        set((s) => ({ portfolios: [...s.portfolios, p], activeId: p.id }))
      })
    },
    rename: async (id, name) => {
      await guard(async () => {
        const p = await api.portfolio.rename(id, name)
        set((s) => ({ portfolios: s.portfolios.map((x) => (x.id === id ? p : x)) }))
      })
    },
    remove: async (id) => {
      await guard(async () => {
        await api.portfolio.delete(id)
        set((s) => {
          const portfolios = s.portfolios.filter((p) => p.id !== id)
          const transactions = { ...s.transactions }
          delete transactions[id]
          return { portfolios, transactions, activeId: s.activeId === id ? (portfolios[0]?.id ?? null) : s.activeId }
        })
      })
    },
    addTransaction: (input) =>
      guard(async () => {
        await api.portfolio.addTransaction(input)
        await reloadTx()
      }),
    updateTransaction: (id, input) =>
      guard(async () => {
        await api.portfolio.updateTransaction(id, input)
        await reloadTx()
      }),
    deleteTransaction: async (_portfolioId, id) => {
      await guard(async () => {
        await api.portfolio.deleteTransaction(id)
        await reloadTx()
      })
    }
  }
})
