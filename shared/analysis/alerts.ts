/**
 * Alert evaluation (pure).
 *
 * Alerts are edge-triggered: a rule fires when its condition transitions from
 * false to true. `armed` tracks whether the condition was already true at the
 * previous evaluation, so a price sitting above a level does not re-fire on
 * every refresh. 'once' rules disable themselves after firing; 'repeating'
 * rules re-arm as soon as the condition clears.
 */
import type { AlertKind, AlertRule, AssetMetrics, Ticker } from '../types'

export const ALERT_KIND_META: Record<AlertKind, { label: string; unit: string; description: string }> = {
  price: { label: 'Price', unit: 'USD', description: 'Last price crosses a level' },
  change24h: { label: '24h change', unit: '%', description: '24-hour price change crosses a percentage' },
  volatility: { label: 'Volatility (7d)', unit: '%', description: 'Annualised 7-day realised volatility crosses a level' },
  volume: { label: 'Volume vs 30d avg', unit: '%', description: '24h volume as a percentage of the 30-day average (200 = double)' },
  rsi: { label: 'RSI (14, daily)', unit: '', description: 'Daily RSI crosses a level' }
}

/** Reads the observed value for a rule kind in the rule's threshold unit. */
export function observedValue(kind: AlertKind, t: Ticker | undefined, m: AssetMetrics | undefined): number | null {
  switch (kind) {
    case 'price':
      return t?.price ?? null
    case 'change24h':
      return t?.change24hPct ?? null
    case 'volatility':
      return m?.vol7d != null ? m.vol7d * 100 : null
    case 'volume':
      return m?.volumeRatio != null ? m.volumeRatio * 100 : null
    case 'rsi':
      return m?.rsi14 ?? null
  }
}

export function conditionMet(rule: Pick<AlertRule, 'direction' | 'threshold'>, value: number | null): boolean {
  if (value == null || !Number.isFinite(value)) return false
  return rule.direction === 'above' ? value > rule.threshold : value < rule.threshold
}

export function describeRule(rule: Pick<AlertRule, 'symbol' | 'kind' | 'direction' | 'threshold'>): string {
  const meta = ALERT_KIND_META[rule.kind]
  const op = rule.direction === 'above' ? '>' : '<'
  const value = rule.kind === 'price' ? `$${rule.threshold.toLocaleString('en-US', { maximumFractionDigits: 8 })}` : `${rule.threshold}${meta.unit}`
  return `${rule.symbol} ${meta.label} ${op} ${value}`
}

export interface EvaluationOutcome {
  rule: AlertRule
  /** Non-null when the rule fired during this evaluation. */
  fired: { value: number; message: string } | null
  /** Whether persisted state (armed/enabled/lastTriggeredAt) changed. */
  changed: boolean
}

export function evaluateRule(rule: AlertRule, t: Ticker | undefined, m: AssetMetrics | undefined, now: number): EvaluationOutcome {
  if (!rule.enabled) return { rule, fired: null, changed: false }
  const value = observedValue(rule.kind, t, m)
  const met = conditionMet(rule, value)
  if (met && !rule.armed && value != null) {
    const message = `${describeRule(rule)} — now ${formatValue(rule.kind, value)}`
    const next: AlertRule = { ...rule, armed: true, lastTriggeredAt: now, triggerCount: rule.triggerCount + 1, enabled: rule.mode === 'repeating' }
    return { rule: next, fired: { value, message }, changed: true }
  }
  if (!met && rule.armed) return { rule: { ...rule, armed: false }, fired: null, changed: true }
  return { rule, fired: null, changed: false }
}

export function formatValue(kind: AlertKind, value: number): string {
  switch (kind) {
    case 'price':
      return `$${value.toLocaleString('en-US', { maximumFractionDigits: value >= 1 ? 2 : 6 })}`
    case 'rsi':
      return value.toFixed(1)
    default:
      return `${value.toFixed(1)}%`
  }
}
