import { setDisplayCurrency } from './format'

let currency = 'USD'
let rates: Record<string, number> = { USD: 1 }

/**
 * Keeps the formatting module's display currency in sync with settings and
 * FX rates. Called synchronously from the stores (before React re-renders)
 * so every component in the next render already formats in the new currency.
 */
export function syncDisplayCurrency(patch: { currency?: string; rates?: Record<string, number> }): void {
  if (patch.currency) currency = patch.currency
  if (patch.rates) rates = patch.rates
  setDisplayCurrency(currency, rates[currency] ?? 1)
}
