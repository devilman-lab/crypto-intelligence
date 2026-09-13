import type { AlertRule, AppSettings, JournalEntry, PaperAccount, PaperPosition, PaperTrade, Portfolio, SavedScreen, Transaction, Watchlist } from './index'

export const BACKUP_SCHEMA_VERSION = 1

/** Complete local backup. Market caches are deliberately excluded (they are re-downloadable). */
export interface BackupFile {
  app: 'crypto-intelligence'
  schemaVersion: number
  appVersion: string
  exportedAt: number
  settings: AppSettings
  watchlists: Watchlist[]
  screens: SavedScreen[]
  portfolios: Portfolio[]
  transactions: Transaction[]
  paperAccounts: PaperAccount[]
  paperPositions: PaperPosition[]
  paperTrades: PaperTrade[]
  journal: JournalEntry[]
  alerts: AlertRule[]
}

export interface BackupSummary {
  appVersion: string
  exportedAt: number
  counts: {
    watchlists: number
    screens: number
    portfolios: number
    transactions: number
    paperAccounts: number
    paperTrades: number
    journal: number
    alerts: number
  }
}

export type ImportMode = 'merge' | 'replace'

export type CsvDataset = 'transactions' | 'journal' | 'paperTrades' | 'holdings'

export interface ExportResult {
  /** Null when the user cancelled the dialog. */
  path: string | null
}
