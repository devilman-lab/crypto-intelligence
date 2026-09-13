/**
 * Decides where the application keeps its data (SQLite database, logs,
 * Chromium profile/cache) and reports which distribution mode is running.
 *
 * Modes
 *  - installed:   NSIS installer or `electron .` in development — the normal
 *                 per-user directory (%APPDATA%\Crypto Intelligence).
 *  - portable:    the electron-builder portable launcher sets
 *                 PORTABLE_EXECUTABLE_DIR / PORTABLE_EXECUTABLE_FILE before
 *                 starting the app. Data lives in "<exe dir>\Crypto Intelligence Data".
 *                 The launcher extracts the program itself into a per-launch
 *                 %TEMP% folder that is deleted on exit, so nothing may be
 *                 stored there.
 *  - custom:      CRYPTO_INTELLIGENCE_DATA_DIR overrides everything (useful
 *                 for tests and for users who want a specific location).
 *
 * If the preferred portable directory is not writable (read-only media, a
 * protected folder), the app falls back to %LOCALAPPDATA%\Crypto Intelligence Portable
 * and tells the user once at start-up. If no candidate is writable the caller
 * shows an error and exits — the database must never be created inside the
 * executable, the asar archive or the temporary extraction directory.
 */
import { accessSync, constants, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export type DistributionMode = 'installed' | 'portable' | 'custom'

export const PORTABLE_DATA_DIR_NAME = 'Crypto Intelligence Data'
export const PORTABLE_FALLBACK_DIR_NAME = 'Crypto Intelligence Portable'
export const DATA_DIR_ENV = 'CRYPTO_INTELLIGENCE_DATA_DIR'

export interface DataLocationInput {
  env: Record<string, string | undefined>
  /** app.getPath('userData') as Electron computed it before any override. */
  defaultUserData: string
  /** %LOCALAPPDATA% (or app.getPath('appData') fallback). */
  localAppData: string
  /** Probe: can we create and write inside this directory? */
  isWritable: (dir: string) => boolean
}

export interface DataLocation {
  mode: DistributionMode
  /** Root directory for all application data. */
  dataDir: string
  /** The location that was preferred but rejected (unwritable), if any. */
  rejected: string | null
  /** Path of the portable executable when running in portable mode. */
  portableExecutable: string | null
}

/** Pure decision function; no Electron dependency so it can be unit-tested. */
export function resolveDataLocation(input: DataLocationInput): DataLocation {
  const { env } = input
  const custom = env[DATA_DIR_ENV]?.trim()
  if (custom) {
    if (!input.isWritable(custom)) throw new Error(`The data directory set by ${DATA_DIR_ENV} is not writable: ${custom}`)
    return { mode: 'custom', dataDir: custom, rejected: null, portableExecutable: env['PORTABLE_EXECUTABLE_FILE'] ?? null }
  }

  const portableDir = env['PORTABLE_EXECUTABLE_DIR']?.trim()
  if (portableDir) {
    const preferred = join(portableDir, PORTABLE_DATA_DIR_NAME)
    const portableExecutable = env['PORTABLE_EXECUTABLE_FILE'] ?? null
    if (input.isWritable(preferred)) return { mode: 'portable', dataDir: preferred, rejected: null, portableExecutable }
    const fallback = join(input.localAppData, PORTABLE_FALLBACK_DIR_NAME)
    if (input.isWritable(fallback)) return { mode: 'portable', dataDir: fallback, rejected: preferred, portableExecutable }
    throw new Error(`Neither "${preferred}" nor "${fallback}" is writable. Copy the portable executable to a folder you can write to.`)
  }

  return { mode: 'installed', dataDir: input.defaultUserData, rejected: null, portableExecutable: null }
}

/** Creates the directory if needed and verifies a file can be written there. */
export function directoryIsWritable(dir: string): boolean {
  try {
    mkdirSync(dir, { recursive: true })
    accessSync(dir, constants.W_OK)
    const probe = join(dir, `.write-test-${process.pid}-${Date.now()}`)
    writeFileSync(probe, 'ok')
    rmSync(probe, { force: true })
    return true
  } catch {
    return false
  }
}

/** Sub-directories used inside the data root. */
export function dataLayout(dataDir: string, mode: DistributionMode) {
  // Installed mode keeps the historical flat layout so existing installations are untouched.
  if (mode === 'installed') return { dbPath: join(dataDir, 'crypto-intelligence.db'), logsDir: join(dataDir, 'logs'), sessionDir: dataDir, backupsDir: null as string | null }
  return { dbPath: join(dataDir, 'database', 'crypto-intelligence.db'), logsDir: join(dataDir, 'logs'), sessionDir: join(dataDir, 'cache'), backupsDir: join(dataDir, 'backups') }
}
