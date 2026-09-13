export interface AppInfo {
  version: string
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
  /** Unix ms timestamp of the last successful market-data fetch, or null if none yet. */
  lastMarketUpdateAt: number | null
  /** Human-readable reason when offline / degraded (e.g. "rate limited"). */
  reason?: string
}
