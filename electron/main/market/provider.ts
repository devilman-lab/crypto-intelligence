import type { CryptoAsset, MarketDataProviderId, OHLCV, Ticker, Timeframe } from '@shared/types'

/**
 * Abstraction over a market-data source. Providers are stateless HTTP
 * clients; caching, fallbacks and persistence live in MarketService so the
 * UI never knows which provider served a value.
 */
export interface MarketDataProvider {
  readonly id: MarketDataProviderId
  readonly name: string
  readonly supportedTimeframes: readonly Timeframe[]

  /** The asset universe (top assets by market cap). */
  getAssets(): Promise<CryptoAsset[]>
  /** Batch tickers for the universe. */
  getTickers(): Promise<Ticker[]>
  /** Single ticker. */
  getTicker(asset: CryptoAsset): Promise<Ticker>
  /** Recent candles, oldest first. `limit` is the max number of candles. */
  getOHLCV(asset: CryptoAsset, timeframe: Timeframe, limit: number): Promise<OHLCV[]>
}
