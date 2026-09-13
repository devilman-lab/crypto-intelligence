# Technical indicators

Implemented in [shared/analysis/indicators.ts](../shared/analysis/indicators.ts) as pure functions over OHLCV arrays (oldest first). Every function returns an array aligned with its input; warm-up positions are `null`. Verified in [tests/indicators.test.ts](../tests/indicators.test.ts) against hand-computed values and, for RSI, the published StockCharts reference series.

| Indicator | Formula | Defaults |
| --- | --- | --- |
| SMA | `SMA_t = (1/n) Σ x_{t-n+1..t}` | — |
| EMA | seed `SMA_n`, then `EMA_t = x_t·k + EMA_{t-1}·(1−k)`, `k = 2/(n+1)` | — |
| RSI | Wilder: first avg gain/loss = simple mean of n changes; then `avg_t = (avg_{t-1}·(n−1) + x_t)/n`; `RSI = 100 − 100/(1+RS)`; `avgLoss = 0 ⇒ 100`, flat ⇒ 50 | 14 |
| MACD | `EMA_fast − EMA_slow`; signal = EMA of MACD (seeded with SMA of first `signal` values); histogram = MACD − signal | 12 / 26 / 9 |
| Bollinger | middle = `SMA_n`; σ = **population** std-dev over the same window; upper/lower = middle ± kσ; bandwidth = (upper−lower)/middle | 20, 2 |
| ATR | `TR = max(h−l, |h−c_prev|, |l−c_prev|)`; Wilder smoothing after an SMA seed | 14 |
| Stochastic | `%K_raw = 100·(c − LL_n)/(HH_n − LL_n)`; `%K = SMA_smoothK(%K_raw)`; `%D = SMA_smoothD(%K)`; flat range ⇒ 50 | 14, 3, 3 |
| VWAP | `Σ(typical·vol)/Σ(vol)` with `typical = (h+l+c)/3`, reset at each UTC day | daily reset |

## Where they are used

- **Charts** ([IndicatorChart](../src/components/chart/IndicatorChart.tsx)): overlays (SMA/EMA/Bollinger/VWAP) on the price pane, oscillators (RSI/MACD/Stochastic/ATR) in sub-panes. Toggles persist in `chartStore` (localStorage).
- **Readings** ([IndicatorReadings](../src/components/chart/IndicatorReadings.tsx)): latest values with descriptive labels ("overbought", "price above"). These are statistics of past data, never recommendations.
- **Performance**: indicators are computed in `useMemo` keyed on the candle array and config; the chart only calls `setData` when candles change and is rebuilt only when the indicator set or theme changes.

## Volatility

Implemented in [shared/analysis/volatility.ts](../shared/analysis/volatility.ts); tested in [tests/volatility.test.ts](../tests/volatility.test.ts).

| Metric | Definition |
| --- | --- |
| Log return | `r_t = ln(P_t / P_{t-1})` |
| Historical volatility | sample standard deviation (n−1) of the trailing `window` log returns, annualised by `√(periods per year)`; crypto year = 365 days (1d → √365, 1h → √8760) |
| Rolling volatility | the same statistic at every index (streaming sums), used for percentile and change |
| Volatility percentile | percentile rank of the current 7d volatility among the trailing 365 rolling 7d readings (needs ≥ 30 readings) |
| Volatility change | `vol7d_now / vol7d_7_candles_ago − 1` |
| ATR % | ATR(14) on daily candles ÷ last close × 100 |
| 24h volatility | annualised std-dev of the last 24 **hourly** returns (a single daily return has no dispersion) |

The `AnalyticsService` (main process) computes an `AssetMetrics` record per asset every 15 minutes: Binance-listed assets from 400 daily + 48 hourly candles; all others from CoinGecko's 7-day hourly sparkline (24h/7d volatility only, `source: 'sparkline'`) with full daily metrics filled in gradually (6 CoinGecko-fetched assets per cycle). Results are persisted to `cache_meta` for offline start-up.

All figures are realised (historical) volatility. The UI labels them as statistics of past price movement and never as predictions.
