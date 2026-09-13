import type { AppDatabase } from '../database'
import type { Watchlist, WatchlistItem } from '@shared/types'
import { AppError, ErrorCodes } from '../../errors'

interface WlRow {
  id: number
  name: string
  created_at: number
}
interface ItemRow {
  watchlist_id: number
  asset_id: string
  symbol: string
  position: number
  added_at: number
}

export class WatchlistRepository {
  constructor(private readonly db: AppDatabase) {}

  list(): Watchlist[] {
    const lists = this.db.prepare('SELECT id, name, created_at FROM watchlists ORDER BY id').all() as WlRow[]
    const items = this.db.prepare('SELECT watchlist_id, asset_id, symbol, position, added_at FROM watchlist_items ORDER BY position').all() as ItemRow[]
    const byList = new Map<number, WatchlistItem[]>()
    for (const r of items) {
      const arr = byList.get(r.watchlist_id) ?? []
      arr.push({ assetId: r.asset_id, symbol: r.symbol, position: r.position, addedAt: r.added_at })
      byList.set(r.watchlist_id, arr)
    }
    return lists.map((l) => ({ id: l.id, name: l.name, createdAt: l.created_at, items: byList.get(l.id) ?? [] }))
  }

  create(name: string): Watchlist {
    const res = this.db.prepare('INSERT INTO watchlists (name, created_at) VALUES (?, ?)').run(name, Date.now())
    return this.get(Number(res.lastInsertRowid))
  }

  rename(id: number, name: string): Watchlist {
    this.db.prepare('UPDATE watchlists SET name = ? WHERE id = ?').run(name, id)
    return this.get(id)
  }

  delete(id: number): void {
    this.db.prepare('DELETE FROM watchlists WHERE id = ?').run(id)
  }

  addItem(id: number, assetId: string, symbol: string): Watchlist {
    this.get(id)
    const max = this.db.prepare('SELECT COALESCE(MAX(position), -1) m FROM watchlist_items WHERE watchlist_id = ?').get(id) as { m: number }
    this.db
      .prepare('INSERT OR IGNORE INTO watchlist_items (watchlist_id, asset_id, symbol, position, added_at) VALUES (?, ?, ?, ?, ?)')
      .run(id, assetId, symbol, max.m + 1, Date.now())
    return this.get(id)
  }

  removeItem(id: number, assetId: string): Watchlist {
    this.db.prepare('DELETE FROM watchlist_items WHERE watchlist_id = ? AND asset_id = ?').run(id, assetId)
    return this.get(id)
  }

  /** Persists a complete new ordering. Unknown ids are ignored; missing ids keep their relative order after the given ones. */
  reorder(id: number, orderedAssetIds: string[]): Watchlist {
    const current = this.get(id).items.map((i) => i.assetId)
    const wanted = orderedAssetIds.filter((a) => current.includes(a))
    const rest = current.filter((a) => !wanted.includes(a))
    const update = this.db.prepare('UPDATE watchlist_items SET position = ? WHERE watchlist_id = ? AND asset_id = ?')
    this.db.transaction(() => {
      ;[...wanted, ...rest].forEach((assetId, position) => update.run(position, id, assetId))
    })()
    return this.get(id)
  }

  private get(id: number): Watchlist {
    const found = this.list().find((w) => w.id === id)
    if (!found) throw new AppError(ErrorCodes.NOT_FOUND, 'Watchlist not found.')
    return found
  }
}
