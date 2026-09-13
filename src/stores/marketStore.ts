import { create } from 'zustand'
import type { Ticker, TickerSnapshot } from '@shared/types'
import { api, errorMessage } from '@/lib/api'

interface MarketState {
  tickers: Ticker[]
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
      set({ tickers: s.tickers, byId: index(s.tickers), updatedAt: s.updatedAt, stale: s.stale, provider: s.provider, loading: false, error: null })
    } catch (err) {
      set({ loading: false, error: errorMessage(err) })
    }
  },
  refresh: async () => {
    set({ refreshing: true })
    try {
      const s = await api.market.refresh()
      set({ tickers: s.tickers, byId: index(s.tickers), updatedAt: s.updatedAt, stale: s.stale, provider: s.provider, error: null })
    } catch (err) {
      set({ error: errorMessage(err) })
    } finally {
      set({ refreshing: false })
    }
  },
  applySnapshot: (s) => set({ tickers: s.tickers, byId: index(s.tickers), updatedAt: s.updatedAt, stale: s.stale, provider: s.provider, loading: false })
}))
