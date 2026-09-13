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
