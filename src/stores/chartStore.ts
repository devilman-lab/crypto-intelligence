import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface IndicatorConfig {
  volume: boolean
  sma: number[]
  ema: number[]
  bollinger: boolean
  vwap: boolean
  rsi: boolean
  macd: boolean
  stochastic: boolean
  atr: boolean
}

export const DEFAULT_INDICATORS: IndicatorConfig = {
  volume: true,
  sma: [20, 50],
  ema: [],
  bollinger: false,
  vwap: false,
  rsi: true,
  macd: false,
  stochastic: false,
  atr: false
}

interface ChartState {
  indicators: IndicatorConfig
  setIndicators: (patch: Partial<IndicatorConfig>) => void
  toggleMa: (kind: 'sma' | 'ema', period: number) => void
  reset: () => void
}

/** Chart UI preferences (persisted in localStorage — purely presentational). */
export const useChartStore = create<ChartState>()(
  persist(
    (set, get) => ({
      indicators: DEFAULT_INDICATORS,
      setIndicators: (patch) => set({ indicators: { ...get().indicators, ...patch } }),
      toggleMa: (kind, period) => {
        const list = get().indicators[kind]
        const next = list.includes(period) ? list.filter((p) => p !== period) : [...list, period].sort((a, b) => a - b)
        set({ indicators: { ...get().indicators, [kind]: next } })
      },
      reset: () => set({ indicators: DEFAULT_INDICATORS })
    }),
    { name: 'ci-chart-prefs', version: 1 }
  )
)
