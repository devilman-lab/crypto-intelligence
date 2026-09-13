import { create } from 'zustand'
import type { AnalyticsSnapshot, AssetMetrics } from '@shared/types'
import { api } from '@/lib/api'

interface AnalyticsState {
  metrics: Record<string, AssetMetrics>
  updatedAt: number | null
  progress: { done: number; total: number; running: boolean }
  load: () => Promise<void>
  apply: (s: AnalyticsSnapshot) => void
}

/** Derived per-asset metrics (volatility, RSI, volume ratio…) pushed by the main process. */
export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  metrics: {},
  updatedAt: null,
  progress: { done: 0, total: 0, running: false },
  load: async () => {
    try {
      set(await api.analytics.getSnapshot())
    } catch {
      /* metrics are optional; the UI shows dashes until they arrive */
    }
  },
  apply: (s) => set(s)
}))
