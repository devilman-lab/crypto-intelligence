/**
 * Schema migrations, applied in order. Each migration runs once inside a
 * transaction and its version is recorded in `schema_migrations`.
 * Never edit a migration after it has shipped; add a new one instead.
 */
export interface Migration {
  version: number
  name: string
  up: string
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_settings',
    up: `
      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `
  }
]
