import { useMemo } from 'react'
import type { OHLCV } from '@shared/types'
import { computeReadings } from '@/hooks/useIndicators'
import { Tooltip } from '@/components/ui/Tooltip'
import { formatCurrency, formatNumber } from '@/lib/format'
import { pricePrecision } from './CandleChart'
import { cn } from '@/lib/cn'

interface Item {
  label: string
  tip: string
  value: string
  tone?: 'positive' | 'negative' | 'warning' | 'muted'
  note?: string
}

function Cell({ item }: { item: Item }) {
  return (
    <Tooltip content={item.tip}>
      <div className="flex items-baseline justify-between gap-3 border-b border-border/60 py-1.5 last:border-b-0">
        <span className="text-xs text-fg-muted">{item.label}</span>
        <span className="text-right">
          <span className={cn('num text-xs', item.tone === 'positive' && 'text-positive', item.tone === 'negative' && 'text-negative', item.tone === 'warning' && 'text-warning', item.tone === 'muted' && 'text-fg-subtle')}>{item.value}</span>
          {item.note && <span className="ml-1.5 text-[10px] text-fg-subtle">{item.note}</span>}
        </span>
      </div>
    </Tooltip>
  )
}

/** Current indicator readings for a candle set, with short interpretive notes (descriptive, not advice). */
export function IndicatorReadings({ candles, className }: { candles: OHLCV[]; className?: string }) {
  const r = useMemo(() => computeReadings(candles), [candles])
  const price = candles[candles.length - 1]?.close ?? null
  const vs = (level: number | null) => (level == null || price == null ? undefined : price > level ? 'price above' : 'price below')
  const money = (v: number | null) => formatCurrency(v)
  const digits = price != null ? pricePrecision(price) : 2

  const momentum: Item[] = [
    { label: 'RSI (14)', tip: 'Relative Strength Index. Above 70 is conventionally called overbought, below 30 oversold.', value: formatNumber(r.rsi14, 1), tone: r.rsi14 == null ? 'muted' : r.rsi14 >= 70 ? 'negative' : r.rsi14 <= 30 ? 'positive' : undefined, note: r.rsi14 == null ? undefined : r.rsi14 >= 70 ? 'overbought' : r.rsi14 <= 30 ? 'oversold' : 'neutral' },
    { label: 'MACD (12,26,9)', tip: 'MACD line minus signal line. Positive histogram = MACD above signal.', value: formatNumber(r.macd, digits), note: r.macdHist == null ? undefined : r.macdHist >= 0 ? 'above signal' : 'below signal', tone: r.macdHist == null ? 'muted' : r.macdHist >= 0 ? 'positive' : 'negative' },
    { label: 'MACD signal', tip: '9-period EMA of the MACD line.', value: formatNumber(r.macdSignal, digits) },
    { label: 'Stochastic %K / %D', tip: 'Position of the close within the 14-period range, smoothed (3,3). Above 80 / below 20 are conventional extremes.', value: `${formatNumber(r.stochK, 1)} / ${formatNumber(r.stochD, 1)}`, tone: r.stochK == null ? 'muted' : r.stochK >= 80 ? 'negative' : r.stochK <= 20 ? 'positive' : undefined }
  ]
  const trend: Item[] = [
    { label: 'SMA 20', tip: '20-period simple moving average.', value: money(r.sma20), note: vs(r.sma20) },
    { label: 'SMA 50', tip: '50-period simple moving average.', value: money(r.sma50), note: vs(r.sma50) },
    { label: 'SMA 200', tip: '200-period simple moving average (needs 200 candles).', value: money(r.sma200), note: vs(r.sma200) },
    { label: 'EMA 12 / 26', tip: 'Exponential moving averages used by MACD.', value: `${money(r.ema12)} / ${money(r.ema26)}` },
    { label: 'VWAP (session)', tip: 'Volume-weighted average price since the start of the UTC day.', value: money(r.vwap), note: vs(r.vwap) }
  ]
  const volatility: Item[] = [
    { label: 'Bollinger upper', tip: 'SMA 20 + 2 standard deviations.', value: money(r.bbUpper) },
    { label: 'Bollinger lower', tip: 'SMA 20 − 2 standard deviations.', value: money(r.bbLower) },
    { label: 'Bollinger %B', tip: 'Where price sits between the bands: 0 = lower band, 1 = upper band.', value: formatNumber(r.bbPercentB, 2), tone: r.bbPercentB == null ? 'muted' : r.bbPercentB > 1 ? 'negative' : r.bbPercentB < 0 ? 'positive' : undefined },
    { label: 'ATR (14)', tip: 'Average True Range: typical candle range over 14 periods, in price units.', value: money(r.atr14), note: r.atrPct != null ? `${r.atrPct.toFixed(2)}% of price` : undefined }
  ]

  return (
    <div className={cn('grid grid-cols-1 gap-x-6 md:grid-cols-3', className)}>
      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">Momentum</div>
        {momentum.map((i) => <Cell key={i.label} item={i} />)}
      </div>
      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">Trend</div>
        {trend.map((i) => <Cell key={i.label} item={i} />)}
      </div>
      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">Volatility & range</div>
        {volatility.map((i) => <Cell key={i.label} item={i} />)}
      </div>
    </div>
  )
}
