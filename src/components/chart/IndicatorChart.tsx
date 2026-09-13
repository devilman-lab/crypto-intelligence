import { useEffect, useRef } from 'react'
import {
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  createChart,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp
} from 'lightweight-charts'
import type { OHLCV } from '@shared/types'
import type { Series } from '@shared/analysis/indicators'
import type { IndicatorConfig } from '@/stores/chartStore'
import type { ComputedIndicators } from '@/hooks/useIndicators'
import { chartColors, chartOptions } from './chartTheme'
import { pricePrecision } from './CandleChart'
import { useSettingsStore } from '@/stores/settingsStore'

interface Props {
  candles: OHLCV[]
  config: IndicatorConfig
  indicators: ComputedIndicators
  className?: string
}

const MA_COLORS = ['#f5a524', '#4f8cff', '#a78bfa', '#2dd4bf', '#f472b6', '#facc15']

type AnySeries = ISeriesApi<'Line'> | ISeriesApi<'Histogram'> | ISeriesApi<'Candlestick'>

interface Handles {
  chart: IChartApi
  candles: ISeriesApi<'Candlestick'>
  volume: ISeriesApi<'Histogram'> | null
  lines: { key: string; series: AnySeries; data: (c: OHLCV[], ind: ComputedIndicators) => { time: UTCTimestamp; value: number; color?: string }[] }[]
}

function toLine(candles: OHLCV[], series: Series | undefined, color?: string) {
  const out: { time: UTCTimestamp; value: number; color?: string }[] = []
  if (!series) return out
  for (let i = 0; i < candles.length; i++) {
    const v = series[i]
    if (v != null) out.push({ time: candles[i]!.time as UTCTimestamp, value: v, color })
  }
  return out
}

/**
 * Candlestick chart with indicator overlays (MAs, Bollinger, VWAP) and
 * oscillator sub-panes (RSI, MACD, Stochastic, ATR). The chart is rebuilt
 * when the indicator configuration or theme changes; candle updates only
 * call setData on the existing series.
 */
export function IndicatorChart({ candles, config, indicators, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const handles = useRef<Handles | null>(null)
  const theme = useSettingsStore((s) => s.settings.theme)
  const configKey = JSON.stringify(config)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const colors = chartColors()
    const chart = createChart(el, { ...chartOptions(), autoSize: true })
    const lines: Handles['lines'] = []

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: colors.up,
      downColor: colors.down,
      wickUpColor: colors.up,
      wickDownColor: colors.down,
      borderVisible: false
    })

    let volume: ISeriesApi<'Histogram'> | null = null
    if (config.volume) {
      volume = chart.addSeries(HistogramSeries, { priceFormat: { type: 'volume' }, priceScaleId: 'vol', lastValueVisible: false, priceLineVisible: false })
      chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } })
    }

    const overlay = (key: string, color: string, data: Handles['lines'][number]['data'], opts: Partial<Parameters<typeof chart.addSeries<'Line'>>[1]> = {}) => {
      const s = chart.addSeries(LineSeries, { color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, ...opts })
      lines.push({ key, series: s, data })
    }

    config.sma.forEach((p, i) => overlay(`sma${p}`, MA_COLORS[i % MA_COLORS.length]!, (c, ind) => toLine(c, ind.sma.find((x) => x.period === p)?.series)))
    config.ema.forEach((p, i) => overlay(`ema${p}`, MA_COLORS[(i + 3) % MA_COLORS.length]!, (c, ind) => toLine(c, ind.ema.find((x) => x.period === p)?.series), { lineStyle: LineStyle.Dashed }))
    if (config.bollinger) {
      overlay('bbU', `${colors.accent}99`, (c, ind) => toLine(c, ind.bollinger?.upper))
      overlay('bbM', `${colors.accent}66`, (c, ind) => toLine(c, ind.bollinger?.middle), { lineStyle: LineStyle.Dotted })
      overlay('bbL', `${colors.accent}99`, (c, ind) => toLine(c, ind.bollinger?.lower))
    }
    if (config.vwap) overlay('vwap', colors.warning, (c, ind) => toLine(c, ind.vwap ?? undefined), { lineWidth: 2 })

    // Sub-panes
    let pane = 1
    const subPane = (key: string, color: string, data: Handles['lines'][number]['data'], kind: 'line' | 'hist' = 'line', paneIndex = pane) => {
      const opts = { priceLineVisible: false, lastValueVisible: true }
      const s = kind === 'line' ? chart.addSeries(LineSeries, { color, lineWidth: 1, ...opts }, paneIndex) : chart.addSeries(HistogramSeries, { color, ...opts }, paneIndex)
      lines.push({ key, series: s, data })
      return s
    }
    if (config.rsi) {
      const s = subPane('rsi', '#a78bfa', (c, ind) => toLine(c, ind.rsi ?? undefined))
      s.createPriceLine({ price: 70, color: `${colors.down}88`, lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false, title: '' })
      s.createPriceLine({ price: 30, color: `${colors.up}88`, lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false, title: '' })
      pane++
    }
    if (config.macd) {
      subPane('macdH', colors.muted, (c, ind) => toLine(c, ind.macd?.histogram).map((p) => ({ ...p, color: p.value >= 0 ? `${colors.up}99` : `${colors.down}99` })), 'hist')
      subPane('macd', '#4f8cff', (c, ind) => toLine(c, ind.macd?.macd))
      subPane('macdS', '#f5a524', (c, ind) => toLine(c, ind.macd?.signal))
      pane++
    }
    if (config.stochastic) {
      const k = subPane('stK', '#2dd4bf', (c, ind) => toLine(c, ind.stochastic?.k))
      subPane('stD', '#f472b6', (c, ind) => toLine(c, ind.stochastic?.d))
      k.createPriceLine({ price: 80, color: `${colors.down}88`, lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false, title: '' })
      k.createPriceLine({ price: 20, color: `${colors.up}88`, lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false, title: '' })
      pane++
    }
    if (config.atr) {
      subPane('atr', colors.warning, (c, ind) => toLine(c, ind.atr ?? undefined))
      pane++
    }

    // Size the panes: main pane gets the lion's share.
    const panes = chart.panes()
    const subCount = panes.length - 1
    if (subCount > 0) {
      panes[0]?.setStretchFactor(Math.max(2.5, 5 - subCount))
      for (let i = 1; i < panes.length; i++) panes[i]?.setStretchFactor(1)
    }

    handles.current = { chart, candles: candleSeries, volume, lines }
    return () => {
      chart.remove()
      handles.current = null
    }
    // Rebuild on config/theme changes only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configKey, theme])

  useEffect(() => {
    const h = handles.current
    if (!h) return
    const colors = chartColors()
    const lastCandle = candles[candles.length - 1]
    const precision = lastCandle ? pricePrecision(lastCandle.close) : 2
    h.candles.applyOptions({ priceFormat: { type: 'price', precision, minMove: 1 / 10 ** precision } })
    h.candles.setData(candles.map((c) => ({ time: c.time as UTCTimestamp, open: c.open, high: c.high, low: c.low, close: c.close })))
    h.volume?.setData(candles.map((c) => ({ time: c.time as UTCTimestamp, value: c.volume, color: c.close >= c.open ? `${colors.up}55` : `${colors.down}55` })))
    for (const l of h.lines) (l.series as ISeriesApi<'Line'>).setData(l.data(candles, indicators))
    h.chart.timeScale().fitContent()
  }, [candles, indicators, configKey, theme])

  return <div ref={containerRef} className={className} />
}
