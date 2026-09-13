import type { AppDatabase } from '../database'
import { DEFAULT_SETTINGS, type AppSettings } from '@shared/types'

const SETTINGS_KEY = 'app'

export class SettingsRepository {
  private readonly selectStmt
  private readonly upsertStmt

  constructor(db: AppDatabase) {
    this.selectStmt = db.prepare('SELECT value FROM settings WHERE key = ?')
    this.upsertStmt = db.prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    )
  }

  get(): AppSettings {
    const row = this.selectStmt.get(SETTINGS_KEY) as { value: string } | undefined
    if (!row) return { ...DEFAULT_SETTINGS }
    try {
      const parsed = JSON.parse(row.value) as Partial<AppSettings>
      return { ...DEFAULT_SETTINGS, ...parsed }
    } catch {
      return { ...DEFAULT_SETTINGS }
    }
  }

  update(patch: Partial<AppSettings>): AppSettings {
    const next: AppSettings = { ...this.get(), ...patch }
    this.upsertStmt.run(SETTINGS_KEY, JSON.stringify(next), Date.now())
    return next
  }
}
