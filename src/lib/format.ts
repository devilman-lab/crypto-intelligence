/** Number/currency formatting helpers used across tables and cards. */

/**
 * Display currency. All stored values are USD; formatting converts with the
 * latest FX multiplier. Inputs (transaction prices, order sizes) stay in USD.
 */
let display = { code: 'USD', rate: 1 }
export function setDisplayCurrency(code: string, rate: number): void {
  display = { code, rate: Number.isFinite(rate) && rate > 0 ? rate : 1 }
}
export function displayCurrency(): { code: string; rate: number } {
  return display
}

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 })

export function formatCurrency(value: number | null | undefined, currency = display.code): string {
  if (value == null || !Number.isFinite(value)) return '—'
  value = value * (currency === display.code ? display.rate : 1)
  const abs = Math.abs(value)
  const digits = abs >= 1000 ? 2 : abs >= 1 ? 2 : abs >= 0.01 ? 4 : 6
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value)
}

/** Money amounts (P&L, totals) always use 2 decimals regardless of magnitude. */
export function formatMoney(value: number | null | undefined, currency = display.code): string {
  if (value == null || !Number.isFinite(value)) return '—'
  value = value * (currency === display.code ? display.rate : 1)
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
}

export function formatCompactCurrency(value: number | null | undefined, currency = display.code): string {
  if (value == null || !Number.isFinite(value)) return '—'
  value = value * (currency === display.code ? display.rate : 1)
  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'JPY' ? '¥' : ''
  return `${value < 0 ? '-' : ''}${symbol}${compact.format(Math.abs(value))}`
}

export function formatNumber(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value)
}

export function formatCompact(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return compact.format(value)
}

export function formatPercent(value: number | null | undefined, digits = 2, withSign = true): string {
  if (value == null || !Number.isFinite(value)) return '—'
  const sign = withSign && value > 0 ? '+' : ''
  return `${sign}${value.toFixed(digits)}%`
}

export function formatRelativeTime(ts: number | null | undefined, now = Date.now()): string {
  if (!ts) return 'never'
  const s = Math.max(0, Math.round((now - ts) / 1000))
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}

export function formatDateTime(ts: number): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(ts)
}

export function formatDate(ts: number): string {
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: '2-digit' }).format(ts)
}
