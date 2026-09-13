import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openDatabase, type AppDatabase } from '../electron/main/database/database'
import { WatchlistRepository } from '../electron/main/database/repositories/watchlistRepository'

describe('WatchlistRepository', () => {
  let dir: string
  let db: AppDatabase
  let repo: WatchlistRepository
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'ci-wl-'))
    db = openDatabase(join(dir, 't.db'))
    repo = new WatchlistRepository(db)
  })
  afterEach(() => {
    db.close()
    rmSync(dir, { recursive: true, force: true })
  })

  it('creates, renames, adds/removes items and deletes with cascade', () => {
    const w = repo.create('Trading')
    expect(w.items).toEqual([])
    repo.addItem(w.id, 'bitcoin', 'BTC')
    repo.addItem(w.id, 'ethereum', 'ETH')
    repo.addItem(w.id, 'bitcoin', 'BTC') // idempotent
    let got = repo.list()[0]!
    expect(got.items.map((i) => i.assetId)).toEqual(['bitcoin', 'ethereum'])
    expect(got.items.map((i) => i.position)).toEqual([0, 1])
    expect(repo.rename(w.id, 'Swing').name).toBe('Swing')
    got = repo.removeItem(w.id, 'bitcoin')
    expect(got.items.map((i) => i.assetId)).toEqual(['ethereum'])
    repo.delete(w.id)
    expect(repo.list()).toEqual([])
    expect((db.prepare('SELECT COUNT(*) c FROM watchlist_items').get() as { c: number }).c).toBe(0)
  })

  it('reorders and tolerates unknown / missing ids', () => {
    const w = repo.create('X')
    for (const [id, s] of [['a', 'A'], ['b', 'B'], ['c', 'C']] as const) repo.addItem(w.id, id, s)
    const got = repo.reorder(w.id, ['c', 'zzz', 'a'])
    expect(got.items.map((i) => i.assetId)).toEqual(['c', 'a', 'b'])
  })

  it('throws NOT_FOUND for unknown watchlist', () => {
    expect(() => repo.addItem(999, 'bitcoin', 'BTC')).toThrow(/not found/i)
  })
})
