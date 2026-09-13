import type { AppDatabase } from '../database'
import type { SavedScreen } from '@shared/types'
import type { ScreenDefinition } from '@shared/analysis/screener'
import { AppError, ErrorCodes } from '../../errors'

interface Row {
  id: number
  name: string
  definition: string
  created_at: number
  updated_at: number
}

export class ScreenRepository {
  constructor(private readonly db: AppDatabase) {}

  list(): SavedScreen[] {
    const rows = this.db.prepare('SELECT * FROM screens ORDER BY name COLLATE NOCASE').all() as Row[]
    return rows.map(toScreen).filter((s): s is SavedScreen => s !== null)
  }

  create(name: string, definition: ScreenDefinition): SavedScreen {
    const now = Date.now()
    const res = this.db.prepare('INSERT INTO screens (name, definition, created_at, updated_at) VALUES (?, ?, ?, ?)').run(name, JSON.stringify(definition), now, now)
    return this.get(Number(res.lastInsertRowid))
  }

  update(id: number, patch: { name?: string; definition?: ScreenDefinition }): SavedScreen {
    const current = this.get(id)
    this.db
      .prepare('UPDATE screens SET name = ?, definition = ?, updated_at = ? WHERE id = ?')
      .run(patch.name ?? current.name, JSON.stringify(patch.definition ?? current.definition), Date.now(), id)
    return this.get(id)
  }

  delete(id: number): void {
    this.db.prepare('DELETE FROM screens WHERE id = ?').run(id)
  }

  private get(id: number): SavedScreen {
    const row = this.db.prepare('SELECT * FROM screens WHERE id = ?').get(id) as Row | undefined
    const s = row ? toScreen(row) : null
    if (!s) throw new AppError(ErrorCodes.NOT_FOUND, 'Screen not found.')
    return s
  }
}

function toScreen(r: Row): SavedScreen | null {
  try {
    return { id: r.id, name: r.name, definition: JSON.parse(r.definition) as ScreenDefinition, createdAt: r.created_at, updatedAt: r.updated_at }
  } catch {
    return null
  }
}
