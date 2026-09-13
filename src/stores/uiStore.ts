import { create } from 'zustand'

export type Page =
  | 'dashboard'
  | 'markets'
  | 'volatility'
  | 'screener'
  | 'analysis'
  | 'portfolio'
  | 'paper'
  | 'journal'
  | 'alerts'
  | 'watchlist'
  | 'settings'

export type Route = { page: Page } | { page: 'asset'; assetId: string }

interface UiState {
  route: Route
  history: Route[]
  navigate: (route: Route) => void
  back: () => void
}

/** UI-only state: navigation. Domain state lives in its own stores. */
export const useUiStore = create<UiState>((set, get) => ({
  route: { page: 'dashboard' },
  history: [],
  navigate: (route) => {
    const { route: current, history } = get()
    if (JSON.stringify(current) === JSON.stringify(route)) return
    set({ route, history: [...history.slice(-30), current] })
  },
  back: () => {
    const { history } = get()
    const prev = history[history.length - 1]
    if (!prev) return
    set({ route: prev, history: history.slice(0, -1) })
  }
}))
