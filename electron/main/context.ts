import type { AppDatabase } from './database/database'
import type { SettingsRepository } from './database/repositories/settingsRepository'

export interface AppPaths {
  userData: string
  dbPath: string
  logDir: string
  logPath: string
}

/**
 * Dependency container for the main process. Built once at startup and
 * passed to IPC handler registrars and background services.
 */
export interface AppContext {
  paths: AppPaths
  db: AppDatabase
  repos: {
    settings: SettingsRepository
  }
}
