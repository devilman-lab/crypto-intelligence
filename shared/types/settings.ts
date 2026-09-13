export type ThemeMode = 'dark' | 'light' | 'system'
export type MarketDataProviderId = 'coingecko' | 'binance'
export type QuoteCurrency = 'USD' | 'EUR' | 'GBP' | 'JPY'

export interface AppSettings {
  theme: ThemeMode
  marketDataProvider: MarketDataProviderId
  /** Seconds between market refreshes. */
  refreshIntervalSec: number
  currency: QuoteCurrency
  notificationsEnabled: boolean
  /** Reserved for the optional future AI module. Always false in MVP. */
  aiModuleEnabled: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  marketDataProvider: 'coingecko',
  refreshIntervalSec: 60,
  currency: 'USD',
  notificationsEnabled: true,
  aiModuleEnabled: false
}
