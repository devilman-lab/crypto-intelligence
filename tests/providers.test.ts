import { describe, it, expect, vi, afterEach } from 'vitest'
import { CoinGeckoProvider } from '../electron/main/market/coingecko'
import { BinanceProvider } from '../electron/main/market/binance'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
afterEach(() => vi.restoreAllMocks())

const cgRow = {
  id: 'bitcoin',
  symbol: 'btc',
  name: 'Bitcoin',
  image: 'https://img/btc.png',
  market_cap_rank: 1,
  current_price: 76738,
  market_cap: 1.5e12,
  total_volume: 1.5e10,
  high_24h: 77479,
  low_24h: 76516,
  circulating_supply: 20083712,
  ath: 126080,
  ath_date: '2025-10-06T10:57:42.000Z',
  last_updated: '2026-09-13T13:16:10.000Z',
  price_change_percentage_1h_in_currency: 0.1,
  price_change_percentage_24h_in_currency: -0.69933,
  price_change_percentage_7d_in_currency: -4.0,
  price_change_percentage_30d_in_currency: 22.1
}

describe('CoinGeckoProvider', () => {
  it('maps markets rows to tickers and skips malformed rows', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json([cgRow, { id: 'broken', symbol: 'x', current_price: 'abc' }, null, { symbol: 'nope' }]))
    const tickers = await new CoinGeckoProvider(250, 0).getTickers()
    expect(tickers).toHaveLength(1)
    const t = tickers[0]!
    expect(t.assetId).toBe('bitcoin')
    expect(t.symbol).toBe('BTC')
    expect(t.price).toBe(76738)
    expect(t.change24hPct).toBeCloseTo(-0.69933)
    expect(t.athDate).toBe(Date.parse('2025-10-06T10:57:42.000Z'))
    expect(t.updatedAt).toBe(Date.parse('2026-09-13T13:16:10.000Z'))
  })

  it('synthesises daily candles from market_chart and converts USD volume to base units', async () => {
    const day = 86_400_000
    const t0 = Date.UTC(2026, 0, 1)
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      json({ prices: [[t0, 100], [t0 + day, 110], [t0 + 2 * day, 99]], total_volumes: [[t0, 1000], [t0 + day, 2200], [t0 + 2 * day, 990]] })
    )
    const candles = await new CoinGeckoProvider(250, 0).getOHLCV({ id: 'x', symbol: 'X', name: 'X', rank: null, imageUrl: null, binanceSymbol: null }, '1d', 10)
    expect(candles).toHaveLength(3)
    expect(candles[1]).toEqual({ time: (t0 + day) / 1000, open: 100, high: 110, low: 100, close: 110, volume: 20 })
    expect(candles[2]?.low).toBe(99)
  })
})

describe('BinanceProvider', () => {
  const asset = { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', rank: 1, imageUrl: null, binanceSymbol: 'BTCUSDT' }

  it('parses klines into candles (time in seconds, numeric strings coerced)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      json([
        [1789300800000, '76792.31', '76866.01', '76690.00', '76763.33', '292.33', 1789304399999, '2.2e7', 44862, '155', '1.1e7', '0'],
        ['bad'],
        [1789304400000, '76763.33', '76781.65', '76680.98', '76720.00', '121.00']
      ])
    )
    const candles = await new BinanceProvider().getOHLCV(asset, '1h', 100)
    expect(candles).toHaveLength(2)
    expect(candles[0]).toEqual({ time: 1789300800, open: 76792.31, high: 76866.01, low: 76690, close: 76763.33, volume: 292.33 })
  })

  it('rejects assets without a Binance symbol', async () => {
    await expect(new BinanceProvider().getOHLCV({ ...asset, binanceSymbol: null }, '1h', 10)).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('filters tickers to tradeable USDT pairs', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ symbols: [{ symbol: 'BTCUSDT', quoteAsset: 'USDT', status: 'TRADING' }, { symbol: 'ETHBTC', quoteAsset: 'BTC', status: 'TRADING' }, { symbol: 'OLDUSDT', quoteAsset: 'USDT', status: 'BREAK' }] }))
      .mockResolvedValueOnce(json([{ symbol: 'BTCUSDT', lastPrice: '76000', priceChangePercent: '-1.2', quoteVolume: '1e9', highPrice: '77000', lowPrice: '75000', closeTime: 1 }, { symbol: 'ETHBTC', lastPrice: '0.03' }, { symbol: 'OLDUSDT', lastPrice: '1' }]))
    const tickers = await new BinanceProvider().getTickers()
    expect(tickers.map((t) => t.symbol)).toEqual(['BTC'])
    expect(tickers[0]?.change24hPct).toBe(-1.2)
    expect(tickers[0]?.marketCap).toBeNull()
  })
})
