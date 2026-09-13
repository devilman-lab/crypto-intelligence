# Market data

## Providers

| Provider | Used for | Key | Rate limiting |
| --- | --- | --- | --- |
| CoinGecko (`/api/v3`) | Asset universe (top 250 by market cap), names, ranks, market caps, 24h/7d/30d changes, ATH; coarse candle fallback | none | ≥ 2.5 s between requests |
| Binance public (`/api/v3`) | Candles for every timeframe (1m … 1w) for assets with a `*USDT` spot pair; optional ticker source | none | ≥ 120 ms between requests |

Both implement `MarketDataProvider` ([electron/main/market/provider.ts](../electron/main/market/provider.ts)). Adding a provider means implementing that interface and registering it in `MarketService`.

## Canonical asset identity

`CryptoAsset.id` is the CoinGecko coin id (e.g. `bitcoin`). Every domain table (watchlists, portfolio, alerts, journal) references this id and denormalises the symbol so records remain readable offline or if an asset is delisted.

`binanceSymbol` is resolved once per day by intersecting `SYMBOL + "USDT"` with Binance's `exchangeInfo` trading symbols.

## MarketService

[electron/main/market/marketService.ts](../electron/main/market/marketService.ts)

- **Universe** refreshed every 24 h, persisted in `assets`.
- **Tickers** refreshed on a timer (`refreshIntervalSec`, min 30 s) from the provider chosen in Settings. When Binance is the ticker source, market cap / rank / 7d / 30d fields are carried over from the last CoinGecko snapshot because Binance does not supply them.
- **Candles** are fetched from Binance when a pair exists, otherwise from CoinGecko (4h/1d/1w only; daily candles are synthesised from the daily price series and volume is converted from USD to base units). Candles are cached in `ohlcv` (last 2000 per asset/timeframe) and re-fetched at most once per candle interval (capped at 60 s).
- On any failure the last cached snapshot is served with `stale: true`, and `connectivity:changed` is pushed so the UI can show "Offline — showing cached data".

## HTTP layer

[electron/main/market/http.ts](../electron/main/market/http.ts)

- 12 s timeout (AbortController), 2 retries with exponential back-off (500 ms, 1 s, … max 8 s).
- Retries only `retryable` errors: network failures, timeouts, 429 and 5xx. 4xx and malformed JSON fail immediately.
- 429 responses pause the provider's limiter for `Retry-After` (default 30 s).
- All failures become `AppError` with a stable code (`NETWORK`, `TIMEOUT`, `RATE_LIMITED`, `PROVIDER`) and a user-safe message.

## Malformed data

Every provider field goes through `num()` (finite number or `null`). Candles are additionally passed through `sanitizeCandles`, which drops non-finite values, `high < low`, non-positive prices, de-duplicates timestamps and sorts ascending.
