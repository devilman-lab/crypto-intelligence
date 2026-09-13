import { useMemo } from 'react'
import type { OHLCV } from '@shared/types'
import { atr, bollinger, closes, ema, last, macd, rsi, sma, stochastic, vwap, type Series } from '@shared/analysis/indicators'
import type { IndicatorConfig } from '@/stores/chartStore'

export interface ComputedIndicators {
  sma: { period: number; series: Series }[]
  ema: { period: number; series: Series }[]
  bollinger: ReturnType<typeof bollinger> | null
  vwap: Series | null
  rsi: Series | null
  macd: ReturnType<typeof macd> | null
  stochastic: ReturnType<typeof stochastic> | null
  atr: Series | null
}

/**
 * Computes the enabled indicators for a candle set. Memoised on candles and
 * config so expensive loops never run on unrelated re-renders.
 */
export function useIndicators(candles: OHLCV[], config: IndicatorConfig): ComputedIndicators {
  return useMemo(() => {
    const c = closes(candles)
    return {
      sma: config.sma.map((period) => ({ period, series: sma(c, period) })),
      ema: config.ema.map((period) => ({ period, series: ema(c, period) })),
      bollinger: config.bollinger ? bollinger(c, 20, 2) : null,
      vwap: config.vwap ? vwap(candles, true) : null,
      rsi: config.rsi ? rsi(c, 14) : null,
      macd: config.macd ? macd(c, 12, 26, 9) : null,
      stochastic: config.stochastic ? stochastic(candles, 14, 3, 3) : null,
      atr: config.atr ? atr(candles, 14) : null
    }
  }, [candles, config])
}

/** Current (latest) readings for display in tables. */
export interface IndicatorReadings {
  rsi14: number | null
  macd: number | null
  macdSignal: number | null
  macdHist: number | null
  bbUpper: number | null
  bbMiddle: number | null
  bbLower: number | null
  bbPercentB: number | null
  atr14: number | null
  atrPct: number | null
  stochK: number | null
  stochD: number | null
  vwap: number | null
  sma20: number | null
  sma50: number | null
  sma200: number | null
  ema12: number | null
  ema26: number | null
}

/** Always-on reading set (independent of chart toggles) used by analysis tables. */
export function computeReadings(candles: OHLCV[]): IndicatorReadings {
  const c = closes(candles)
  const lastClose = c[c.length - 1] ?? null
  const bb = bollinger(c, 20, 2)
  const m = macd(c, 12, 26, 9)
  const st = stochastic(candles, 14, 3, 3)
  const a = last(atr(candles, 14))
  const up = last(bb.upper)
  const lo = last(bb.lower)
  return {
    rsi14: last(rsi(c, 14)),
    macd: last(m.macd),
    macdSignal: last(m.signal),
    macdHist: last(m.histogram),
    bbUpper: up,
    bbMiddle: last(bb.middle),
    bbLower: lo,
    bbPercentB: up != null && lo != null && lastClose != null && up !== lo ? (lastClose - lo) / (up - lo) : null,
    atr14: a,
    atrPct: a != null && lastClose ? (a / lastClose) * 100 : null,
    stochK: last(st.k),
    stochD: last(st.d),
    vwap: last(vwap(candles, true)),
    sma20: last(sma(c, 20)),
    sma50: last(sma(c, 50)),
    sma200: last(sma(c, 200)),
    ema12: last(ema(c, 12)),
    ema26: last(ema(c, 26))
  }
}
