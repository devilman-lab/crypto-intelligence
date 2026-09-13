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
