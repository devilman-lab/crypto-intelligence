import { useEffect, useRef } from 'react'
import { CandlestickSeries, HistogramSeries, createChart, type IChartApi, type ISeriesApi, type UTCTimestamp } from 'lightweight-charts'
import type { OHLCV } from '@shared/types'
import { chartColors, chartOptions } from './chartTheme'
import { useSettingsStore } from '@/stores/settingsStore'

interface Props {
  candles: OHLCV[]
  showVolume?: boolean
  className?: string
}

/** Candlestick + volume chart (Lightweight Charts). Resizes with its container. */
export function CandleChart({ candles, showVolume = true, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const theme = useSettingsStore((s) => s.settings.theme)

  // Create / destroy chart.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const chart = createChart(el, { ...chartOptions(), autoSize: true })
    const colors = chartColors()
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: colors.up,
      downColor: colors.down,
      wickUpColor: colors.up,
      wickDownColor: colors.down,
      borderVisible: false,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 }
    })
    const volumeSeries = chart.addSeries(HistogramSeries, { priceFormat: { type: 'volume' }, priceScaleId: 'vol', visible: showVolume })
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } })
    chartRef.current = chart
    candleRef.current = candleSeries
    volumeRef.current = volumeSeries
    return () => {
      chart.remove()
      chartRef.current = null
      candleRef.current = null
      volumeRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme])

  // Feed data.
  useEffect(() => {
    const candleSeries = candleRef.current
    const volumeSeries = volumeRef.current
    const chart = chartRef.current
    if (!candleSeries || !volumeSeries || !chart) return
    const colors = chartColors()
    const last = candles[candles.length - 1]
    const precision = last ? pricePrecision(last.close) : 2
    candleSeries.applyOptions({ priceFormat: { type: 'price', precision, minMove: 1 / 10 ** precision } })
    candleSeries.setData(candles.map((c) => ({ time: c.time as UTCTimestamp, open: c.open, high: c.high, low: c.low, close: c.close })))
    volumeSeries.setData(candles.map((c) => ({ time: c.time as UTCTimestamp, value: c.volume, color: c.close >= c.open ? `${colors.up}55` : `${colors.down}55` })))
    volumeSeries.applyOptions({ visible: showVolume })
    chart.timeScale().fitContent()
  }, [candles, showVolume, theme])

  return <div ref={containerRef} className={className} />
}

export function pricePrecision(price: number): number {
  if (price >= 1000) return 2
  if (price >= 1) return 2
  if (price >= 0.01) return 4
  if (price >= 0.0001) return 6
  return 8
}
