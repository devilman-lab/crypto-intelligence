import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openDatabase, type AppDatabase } from '../electron/main/database/database'
import { SettingsRepository } from '../electron/main/database/repositories/settingsRepository'
import { DEFAULT_SETTINGS } from '../shared/types'

describe('database + settings repository', () => {
  let dir: string
  let db: AppDatabase

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'ci-db-'))
    db = openDatabase(join(dir, 'test.db'))
  })
  afterEach(() => {
    db.close()
    rmSync(dir, { recursive: true, force: true })
  })

  it('applies migrations exactly once', () => {
    const rows = db.prepare('SELECT version FROM schema_migrations ORDER BY version').all() as { version: number }[]
    expect(rows.length).toBeGreaterThan(0)
    expect(rows[0]?.version).toBe(1)
    // Re-opening must not re-apply.
    db.close()
    db = openDatabase(join(dir, 'test.db'))
    const again = db.prepare('SELECT COUNT(*) c FROM schema_migrations').get() as { c: number }
    expect(again.c).toBe(rows.length)
  })

  it('returns defaults when nothing is stored and persists updates', () => {
    const repo = new SettingsRepository(db)
    expect(repo.get()).toEqual(DEFAULT_SETTINGS)
    const next = repo.update({ theme: 'light', refreshIntervalSec: 120 })
    expect(next.theme).toBe('light')
    expect(next.refreshIntervalSec).toBe(120)
    expect(new SettingsRepository(db).get()).toEqual(next)
  })

  it('falls back to defaults on corrupt stored JSON', () => {
    db.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)').run('app', '{not json', Date.now())
    expect(new SettingsRepository(db).get()).toEqual(DEFAULT_SETTINGS)
  })
})

describe('market cache repository', () => {
  it('round-trips assets, tickers and candles with trimming', async () => {
    const { MarketCacheRepository } = await import('../electron/main/database/repositories/marketCacheRepository')
    const dir = mkdtempSync(join(tmpdir(), 'ci-db-'))
    const db = openDatabase(join(dir, 'm.db'))
    const repo = new MarketCacheRepository(db)
    repo.saveAssets([{ id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', rank: 1, imageUrl: null, binanceSymbol: 'BTCUSDT' }])
    expect(repo.loadAssets().assets[0]?.binanceSymbol).toBe('BTCUSDT')

    const ticker = { assetId: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', rank: 1, imageUrl: null, price: 1, change1hPct: null, change24hPct: 2, change7dPct: null, change30dPct: null, marketCap: null, volume24h: null, high24h: null, low24h: null, circulatingSupply: null, ath: null, athDate: null, updatedAt: 5 }
    repo.saveTickers([ticker], 'coingecko')
    const loaded = repo.loadTickers()
    expect(loaded.tickers).toEqual([ticker])
    expect(loaded.provider).toBe('coingecko')

    const candles = Array.from({ length: 10 }, (_, i) => ({ time: i * 60, open: 1, high: 2, low: 0.5, close: 1.5, volume: 1 }))
    repo.saveCandles('bitcoin', '1m', candles, 5)
    const got = repo.loadCandles('bitcoin', '1m', 100)
    expect(got.map((c) => c.time)).toEqual([300, 360, 420, 480, 540])
    db.close()
    rmSync(dir, { recursive: true, force: true })
  })
})

describe('screen repository', () => {
  it('creates, updates, lists and deletes saved screens', async () => {
    const { ScreenRepository } = await import('../electron/main/database/repositories/screenRepository')
    const dir = mkdtempSync(join(tmpdir(), 'ci-db-'))
    const db = openDatabase(join(dir, 's.db'))
    const repo = new ScreenRepository(db)
    const def = { logic: 'and' as const, conditions: [{ id: 'a', field: 'rsi14' as const, op: 'lt' as const, value: 30 }] }
    const s = repo.create('Oversold', def)
    expect(s.definition).toEqual(def)
    const u = repo.update(s.id, { name: 'Oversold v2' })
    expect(u.name).toBe('Oversold v2')
    expect(u.definition).toEqual(def)
    expect(repo.list()).toHaveLength(1)
    repo.delete(s.id)
    expect(repo.list()).toHaveLength(0)
    db.close()
    rmSync(dir, { recursive: true, force: true })
  })
})

describe('portfolio repository', () => {
  it('manages portfolios and transactions with cascade delete', async () => {
    const { PortfolioRepository } = await import('../electron/main/database/repositories/portfolioRepository')
    const dir = mkdtempSync(join(tmpdir(), 'ci-db-'))
    const db = openDatabase(join(dir, 'p.db'))
    const repo = new PortfolioRepository(db)
    const p = repo.createPortfolio('Main')
    const tx = repo.addTransaction({ portfolioId: p.id, assetId: 'bitcoin', type: 'buy', quantity: 0.5, price: 90000, fee: 10, timestamp: 1_700_000_000_000, notes: 'x' }, 'BTC')
    expect(tx.symbol).toBe('BTC')
    const upd = repo.updateTransaction(tx.id, { portfolioId: p.id, assetId: 'bitcoin', type: 'buy', quantity: 1, price: 90000, fee: 10, timestamp: 1_700_000_000_000, notes: '' }, 'BTC')
    expect(upd.quantity).toBe(1)
    expect(repo.listTransactions(p.id)).toHaveLength(1)
    expect(repo.listAllTransactions()).toHaveLength(1)
    expect(() => repo.addTransaction({ portfolioId: 999, assetId: 'bitcoin', type: 'buy', quantity: 1, price: 1, fee: 0, timestamp: 1_700_000_000_000, notes: '' }, 'BTC')).toThrow(/not found/i)
    repo.deletePortfolio(p.id)
    expect(repo.listAllTransactions()).toHaveLength(0)
    db.close()
    rmSync(dir, { recursive: true, force: true })
  })
})

describe('paper repository', () => {
  it('creates account, upserts positions, records trades and resets', async () => {
    const { PaperRepository } = await import('../electron/main/database/repositories/paperRepository')
    const dir = mkdtempSync(join(tmpdir(), 'ci-db-'))
    const db = openDatabase(join(dir, 'pp.db'))
    const repo = new PaperRepository(db)
    const acc = repo.createAccount('Sim', 10_000, 0.001)
    const pos = repo.upsertPosition(acc.id, { assetId: 'bitcoin', symbol: 'BTC', side: 'long', quantity: 1, entryPrice: 100, entryFees: 0.1, openedAt: 1 })
    expect(repo.findPosition(acc.id, 'bitcoin')?.id).toBe(pos.id)
    repo.upsertPosition(acc.id, { ...pos, quantity: 2 }, pos.id)
    expect(repo.getPosition(pos.id).quantity).toBe(2)
    repo.addTrade(acc.id, { assetId: 'bitcoin', symbol: 'BTC', side: 'long', quantity: 1, entryPrice: 100, exitPrice: 110, fees: 0.2, pnl: 9.8, roiPct: 9.8, openedAt: 1, closedAt: 2 })
    repo.setCash(acc.id, 5000)
    expect(repo.getAccount(acc.id).cash).toBe(5000)
    expect(repo.listTrades(acc.id)).toHaveLength(1)
    const reset = repo.resetAccount(acc.id, 20_000)
    expect(reset.cash).toBe(20_000)
    expect(repo.listPositions(acc.id)).toHaveLength(0)
    expect(repo.listTrades(acc.id)).toHaveLength(0)
    db.close()
    rmSync(dir, { recursive: true, force: true })
  })
})

describe('journal repository', () => {
  it('derives pnl/result on create and update, lists strategies, deletes', async () => {
    const { JournalRepository } = await import('../electron/main/database/repositories/journalRepository')
    const dir = mkdtempSync(join(tmpdir(), 'ci-db-'))
    const db = openDatabase(join(dir, 'j.db'))
    const repo = new JournalRepository(db)
    const base = { assetId: 'bitcoin', side: 'long' as const, entryPrice: 100, exitPrice: 120, quantity: 2, fees: 1, strategy: 'Breakout', entryReason: '', exitReason: '', emotion: 'calm' as const, notes: '', screenshotPath: '', tags: ['a', 'b'], openedAt: 1_700_000_000_000, closedAt: 1_700_000_100_000 }
    const e = repo.create(base, 'BTC')
    expect(e.pnl).toBe(39)
    expect(e.result).toBe('win')
    expect(e.tags).toEqual(['a', 'b'])
    const open = repo.update(e.id, { ...base, exitPrice: null, closedAt: null }, 'BTC')
    expect(open.pnl).toBeNull()
    expect(open.result).toBe('open')
    repo.create({ ...base, strategy: 'Trend' }, 'BTC')
    expect(repo.strategies()).toEqual(['Breakout', 'Trend'])
    repo.delete(e.id)
    expect(repo.list()).toHaveLength(1)
    db.close()
    rmSync(dir, { recursive: true, force: true })
  })
})
