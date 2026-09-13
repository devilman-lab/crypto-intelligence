/**
 * Market screener: declarative conditions evaluated against a ticker plus
 * its derived metrics. Pure and synchronous so it runs instantly in the
 * renderer and can be reused by alerts (main process) and tests.
 */
import type { AssetMetrics, Ticker } from '../types'

export type ScreenField =
  | 'price'
  | 'change1h'
  | 'change24h'
  | 'change7d'
  | 'change30d'
  | 'marketCap'
  | 'volume24h'
  | 'volumeRatio'
  | 'vol24h'
  | 'vol7d'
  | 'vol30d'
  | 'volChange'
  | 'volPercentile'
  | 'atrPct'
  | 'rsi14'
  | 'bbPercentB'
  | 'vsSma50'
  | 'vsSma200'
  | 'macdHist'
  | 'rank'

export type ScreenOperator = 'gt' | 'lt' | 'gte' | 'lte' | 'between'

export interface ScreenCondition {
  id: string
  field: ScreenField
  op: ScreenOperator
  value: number
  /** Upper bound for `between`. */
  value2?: number
}

export interface ScreenDefinition {
  /** How conditions combine. */
  logic: 'and' | 'or'
  conditions: ScreenCondition[]
}

export interface FieldMeta {
  label: string
  group: 'Price' | 'Volume' | 'Volatility' | 'Momentum' | 'Trend'
  /** Unit hint for the input; 'pct' values are entered as percentages (5 = 5%). */
  unit: 'usd' | 'pct' | 'ratio' | 'number' | 'x'
  description: string
}

export const FIELD_META: Record<ScreenField, FieldMeta> = {
  price: { label: 'Price', group: 'Price', unit: 'usd', description: 'Last price in USD' },
  change1h: { label: '1h change', group: 'Price', unit: 'pct', description: 'Price change over the last hour (%)' },
  change24h: { label: '24h change', group: 'Price', unit: 'pct', description: 'Price change over the last 24 hours (%)' },
  change7d: { label: '7d change', group: 'Price', unit: 'pct', description: 'Price change over the last 7 days (%)' },
  change30d: { label: '30d change', group: 'Price', unit: 'pct', description: 'Price change over the last 30 days (%)' },
  marketCap: { label: 'Market cap', group: 'Price', unit: 'usd', description: 'Market capitalisation in USD' },
  rank: { label: 'Market cap rank', group: 'Price', unit: 'number', description: 'Rank by market cap (1 = largest)' },
  volume24h: { label: '24h volume', group: 'Volume', unit: 'usd', description: 'Trading volume over the last 24 hours in USD' },
  volumeRatio: { label: 'Volume vs 30d avg', group: 'Volume', unit: 'pct', description: '24h volume as % of the trailing 30-day average daily volume (200 = double)' },
  vol24h: { label: 'Volatility 24h', group: 'Volatility', unit: 'pct', description: 'Annualised realised volatility of the last 24 hourly returns (%)' },
  vol7d: { label: 'Volatility 7d', group: 'Volatility', unit: 'pct', description: 'Annualised realised volatility of the last 7 daily returns (%)' },
  vol30d: { label: 'Volatility 30d', group: 'Volatility', unit: 'pct', description: 'Annualised realised volatility of the last 30 daily returns (%)' },
  volChange: { label: 'Volatility change', group: 'Volatility', unit: 'pct', description: '7d volatility vs the previous 7-day window (%)' },
  volPercentile: { label: 'Volatility percentile', group: 'Volatility', unit: 'number', description: 'Current 7d volatility percentile within the trailing year (0–100)' },
  atrPct: { label: 'ATR %', group: 'Volatility', unit: 'pct', description: 'ATR(14) as % of price' },
  rsi14: { label: 'RSI (14)', group: 'Momentum', unit: 'number', description: 'Daily RSI, 0–100' },
  bbPercentB: { label: 'Bollinger %B', group: 'Momentum', unit: 'ratio', description: 'Position within Bollinger Bands (0 = lower, 1 = upper)' },
  macdHist: { label: 'MACD histogram', group: 'Momentum', unit: 'number', description: 'MACD minus signal (price units); > 0 means MACD above signal' },
  vsSma50: { label: 'Price vs SMA 50', group: 'Trend', unit: 'pct', description: 'Distance of price from the 50-day SMA (%)' },
  vsSma200: { label: 'Price vs SMA 200', group: 'Trend', unit: 'pct', description: 'Distance of price from the 200-day SMA (%)' }
}

export const OPERATOR_LABEL: Record<ScreenOperator, string> = { gt: '>', gte: '≥', lt: '<', lte: '≤', between: 'between' }

/** Reads a field value in the same unit the user types (percent fields as percent). */
export function fieldValue(field: ScreenField, t: Ticker, m: AssetMetrics | undefined): number | null {
  const pct = (v: number | null | undefined) => (v == null ? null : v * 100)
  switch (field) {
    case 'price':
      return t.price
    case 'change1h':
      return t.change1hPct
    case 'change24h':
      return t.change24hPct
    case 'change7d':
      return t.change7dPct
    case 'change30d':
      return t.change30dPct
    case 'marketCap':
      return t.marketCap
    case 'rank':
      return t.rank
    case 'volume24h':
      return t.volume24h
    case 'volumeRatio':
      return pct(m?.volumeRatio)
    case 'vol24h':
      return pct(m?.vol24h)
    case 'vol7d':
      return pct(m?.vol7d)
    case 'vol30d':
      return pct(m?.vol30d)
    case 'volChange':
      return pct(m?.volChange)
    case 'volPercentile':
      return m?.volPercentile ?? null
    case 'atrPct':
      return m?.atrPct ?? null
    case 'rsi14':
      return m?.rsi14 ?? null
    case 'bbPercentB':
      return m?.bbPercentB ?? null
    case 'macdHist':
      return m?.macdHist ?? null
    case 'vsSma50':
      return m?.vsSma50Pct ?? null
    case 'vsSma200':
      return m?.vsSma200Pct ?? null
  }
}

export function evaluateCondition(c: ScreenCondition, value: number | null): boolean {
  if (value == null || !Number.isFinite(value)) return false
  switch (c.op) {
    case 'gt':
      return value > c.value
    case 'gte':
      return value >= c.value
    case 'lt':
      return value < c.value
    case 'lte':
      return value <= c.value
    case 'between': {
      const lo = Math.min(c.value, c.value2 ?? c.value)
      const hi = Math.max(c.value, c.value2 ?? c.value)
      return value >= lo && value <= hi
    }
  }
}

/** True when the ticker satisfies the screen. An empty screen matches everything. */
export function matchesScreen(def: ScreenDefinition, t: Ticker, m: AssetMetrics | undefined): boolean {
  if (def.conditions.length === 0) return true
  const results = def.conditions.map((c) => evaluateCondition(c, fieldValue(c.field, t, m)))
  return def.logic === 'and' ? results.every(Boolean) : results.some(Boolean)
}

export function runScreen(def: ScreenDefinition, tickers: readonly Ticker[], metrics: Record<string, AssetMetrics>): Ticker[] {
  return tickers.filter((t) => matchesScreen(def, t, metrics[t.assetId]))
}

/** Human-readable summary, e.g. "RSI (14) < 30 AND Volatility 7d > 60%". */
export function describeScreen(def: ScreenDefinition): string {
  const fmt = (c: ScreenCondition) => {
    const meta = FIELD_META[c.field]
    const unit = meta.unit === 'pct' ? '%' : meta.unit === 'usd' ? ' USD' : ''
    if (c.op === 'between') return `${meta.label} between ${c.value}${unit} and ${c.value2 ?? c.value}${unit}`
    return `${meta.label} ${OPERATOR_LABEL[c.op]} ${c.value}${unit}`
  }
  return def.conditions.map(fmt).join(def.logic === 'and' ? ' AND ' : ' OR ')
}

let seq = 0
export function newCondition(field: ScreenField = 'rsi14', op: ScreenOperator = 'lt', value = 30): ScreenCondition {
  return { id: `c${Date.now().toString(36)}${(seq++).toString(36)}`, field, op, value }
}

export interface ScreenPreset {
  name: string
  description: string
  definition: ScreenDefinition
}

/** Built-in starting points. They describe market conditions, not trading signals. */
export const SCREEN_PRESETS: ScreenPreset[] = [
  {
    name: 'High Volatility',
    description: 'Assets whose 7-day realised volatility is unusually high and rising.',
    definition: { logic: 'and', conditions: [newCondition('vol7d', 'gt', 80), newCondition('volChange', 'gt', 10), newCondition('volume24h', 'gt', 10_000_000)] }
  },
  {
    name: 'Oversold',
    description: 'Daily RSI below 30 with meaningful liquidity.',
    definition: { logic: 'and', conditions: [newCondition('rsi14', 'lt', 30), newCondition('volume24h', 'gt', 5_000_000)] }
  },
  {
    name: 'Momentum',
    description: 'Positive 7-day and 30-day change, price above the 50-day average, RSI not yet extreme.',
    definition: { logic: 'and', conditions: [newCondition('change7d', 'gt', 5), newCondition('change30d', 'gt', 10), newCondition('vsSma50', 'gt', 0), newCondition('rsi14', 'between', 50), newCondition('volume24h', 'gt', 10_000_000)] }
  },
  {
    name: 'Volume Spike',
    description: '24h volume more than double the 30-day average.',
    definition: { logic: 'and', conditions: [newCondition('volumeRatio', 'gt', 200), newCondition('volume24h', 'gt', 5_000_000)] }
  },
  {
    name: 'Breakout Candidates',
    description: 'Price pressing the upper Bollinger Band on rising volume.',
    definition: { logic: 'and', conditions: [newCondition('bbPercentB', 'gt', 0.95), newCondition('volumeRatio', 'gt', 130), newCondition('volume24h', 'gt', 10_000_000)] }
  }
]
// Fix the "between" bound of the Momentum preset (RSI 50–70).
{
  const rsiCond = SCREEN_PRESETS[2]!.definition.conditions.find((c) => c.field === 'rsi14')
  if (rsiCond) rsiCond.value2 = 70
}
