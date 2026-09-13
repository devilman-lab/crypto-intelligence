import type { AppDatabase } from './database/database'
import type { SettingsRepository } from './database/repositories/settingsRepository'
import type { MarketCacheRepository } from './database/repositories/marketCacheRepository'
import type { WatchlistRepository } from './database/repositories/watchlistRepository'
import type { ScreenRepository } from './database/repositories/screenRepository'
import type { MarketService } from './market/marketService'
import type { AnalyticsService } from './market/analyticsService'

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
    marketCache: MarketCacheRepository
    watchlists: WatchlistRepository
    screens: ScreenRepository
  }
  services: {
    market: MarketService
    analytics: AnalyticsService
  }
}
