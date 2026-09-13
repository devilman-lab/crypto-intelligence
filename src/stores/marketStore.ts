import { create } from 'zustand'
import type { Ticker, TickerSnapshot } from '@shared/types'
import { api, errorMessage } from '@/lib/api'
import { syncDisplayCurrency } from '@/lib/displayCurrency'

interface MarketState {
  tickers: Ticker[]
  fxRates: Record<string, number>
  byId: Record<string, Ticker>
  updatedAt: number | null
  stale: boolean
  provider: string
  loading: boolean
  refreshing: boolean
  error: string | null
  load: () => Promise<void>
  refresh: () => Promise<void>
  applySnapshot: (s: TickerSnapshot) => void
}

function index(tickers: Ticker[]): Record<string, Ticker> {
  const byId: Record<string, Ticker> = {}
  for (const t of tickers) byId[t.assetId] = t
  return byId
}

/** Live market snapshot pushed from the main process. */
export const useMarketStore = create<MarketState>((set) => ({
  tickers: [],
  fxRates: { USD: 1 },
  byId: {},
  updatedAt: null,
  stale: true,
  provider: '',
  loading: true,
  refreshing: false,
  error: null,
  load: async () => {
    try {
      const s = await api.market.getSnapshot()
      syncDisplayCurrency({ rates: s.fxRates })
      set({ tickers: s.tickers, fxRates: s.fxRates, byId: index(s.tickers), updatedAt: s.updatedAt, stale: s.stale, provider: s.provider, loading: false, error: null })
    } catch (err) {
      set({ loading: false, error: errorMessage(err) })
    }
  },
  refresh: async () => {
    set({ refreshing: true })
    try {
      const s = await api.market.refresh()
      syncDisplayCurrency({ rates: s.fxRates })
      set({ tickers: s.tickers, fxRates: s.fxRates, byId: index(s.tickers), updatedAt: s.updatedAt, stale: s.stale, provider: s.provider, error: null })
    } catch (err) {
      set({ error: errorMessage(err) })
    } finally {
      set({ refreshing: false })
    }
  },
  applySnapshot: (s) => {
    syncDisplayCurrency({ rates: s.fxRates })
    set({ tickers: s.tickers, fxRates: s.fxRates, byId: index(s.tickers), updatedAt: s.updatedAt, stale: s.stale, provider: s.provider, loading: false })
  }
}))
