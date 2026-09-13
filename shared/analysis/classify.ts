import type { AssetMetrics, Ticker } from '../types'

const STABLE_SYMBOLS = new Set(['USDT', 'USDC', 'DAI', 'USDS', 'USDE', 'FDUSD', 'TUSD', 'USD1', 'PYUSD', 'USDD', 'RLUSD', 'BUSD', 'USDG', 'USDY', 'USYC', 'GUSD', 'USDP', 'FRAX', 'LUSD', 'EURC', 'EURT', 'BUIDL', 'XAUT', 'PAXG', 'USDTB', 'USD0', 'SUSDS', 'SUSDE', 'SDAI'])

/**
 * Heuristic stablecoin / pegged-asset detector: a known symbol list plus a
 * price≈1 with negligible volatility. Used to declutter volatility views.
 */
export function isStablecoin(ticker: Pick<Ticker, 'symbol' | 'price'>, metrics?: Pick<AssetMetrics, 'vol7d'> | null): boolean {
  if (STABLE_SYMBOLS.has(ticker.symbol.toUpperCase())) return true
  const nearOne = Math.abs(ticker.price - 1) < 0.02
  const calm = metrics?.vol7d != null && metrics.vol7d < 0.05
  return nearOne && calm
}
