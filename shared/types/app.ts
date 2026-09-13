export type DistributionMode = 'installed' | 'portable' | 'custom'

export interface AppInfo {
  version: string
  /** installed = NSIS/dev, portable = single-exe build, custom = CRYPTO_INTELLIGENCE_DATA_DIR override. */
  mode: DistributionMode
  /** Root folder holding the database, logs and cache. */
  dataDir: string
  /** Full path of the portable executable (portable mode only). */
  portableExecutable: string | null
  electronVersion: string
  platform: NodeJS.Platform
  arch: string
  dbPath: string
  logPath: string
  logDir: string
  userDataPath: string
}

/** Connectivity status pushed from the main process to the renderer. */
export interface ConnectivityStatus {
  online: boolean
  /** Online, but the last refresh failed for a provider-side reason (rate limit, 5xx). */
  degraded?: boolean
  /** Unix ms timestamp of the last successful market-data fetch, or null if none yet. */
  lastMarketUpdateAt: number | null
  /** Human-readable reason when offline / degraded (e.g. "rate limited"). */
  reason?: string
}
