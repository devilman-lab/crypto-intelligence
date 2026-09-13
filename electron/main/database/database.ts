import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { createLogger } from '../logger'
import { migrations } from './migrations'

const log = createLogger('database')

export type AppDatabase = Database.Database

/**
 * Opens (or creates) the SQLite database and applies pending migrations.
 * Only the main process ever touches the database; the renderer talks to
 * repositories through validated IPC handlers.
 */
export function openDatabase(filePath: string): AppDatabase {
  mkdirSync(dirname(filePath), { recursive: true })
  const db = new Database(filePath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('synchronous = NORMAL')
  applyMigrations(db)
  log.info(`opened ${filePath}`)
  return db
}

function applyMigrations(db: AppDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    );
  `)
  const applied = new Set(
    (db.prepare('SELECT version FROM schema_migrations').all() as { version: number }[]).map(
      (r) => r.version
    )
  )
  const insert = db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)')
  for (const m of migrations) {
    if (applied.has(m.version)) continue
    const run = db.transaction(() => {
      db.exec(m.up)
      insert.run(m.version, m.name, Date.now())
    })
    run()
    log.info(`applied migration ${m.version} ${m.name}`)
  }
}
