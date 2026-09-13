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
