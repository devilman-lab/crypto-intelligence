import { describe, it, expect } from 'vitest'
import { mkdtempSync, rmSync, chmodSync, existsSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DATA_DIR_ENV, dataLayout, directoryIsWritable, PORTABLE_DATA_DIR_NAME, PORTABLE_FALLBACK_DIR_NAME, resolveDataLocation } from '../electron/main/dataLocation'

const base = {
  defaultUserData: 'C:\\Users\\me\\AppData\\Roaming\\Crypto Intelligence',
  localAppData: 'C:\\Users\\me\\AppData\\Local'
}
const writable = () => true

describe('resolveDataLocation', () => {
  it('uses the per-user directory when not portable', () => {
    const r = resolveDataLocation({ ...base, env: {}, isWritable: writable })
    expect(r).toEqual({ mode: 'installed', dataDir: base.defaultUserData, rejected: null, portableExecutable: null })
  })

  it('stores portable data beside the executable when PORTABLE_EXECUTABLE_DIR is set', () => {
    const env = { PORTABLE_EXECUTABLE_DIR: 'E:\\Tools', PORTABLE_EXECUTABLE_FILE: 'E:\\Tools\\Crypto-Intelligence-Portable-0.1.0.exe' }
    const r = resolveDataLocation({ ...base, env, isWritable: writable })
    expect(r.mode).toBe('portable')
    expect(r.dataDir).toBe(join('E:\\Tools', PORTABLE_DATA_DIR_NAME))
    expect(r.rejected).toBeNull()
    expect(r.portableExecutable).toBe(env.PORTABLE_EXECUTABLE_FILE)
    // Never inside the temporary extraction directory, the asar or the executable itself.
    expect(r.dataDir).not.toMatch(/app\.asar|\.exe|\\Temp\\/i)
  })

  it('falls back to LOCALAPPDATA when the executable folder is read-only, and reports the rejected path', () => {
    const preferred = join('D:\\ReadOnly', PORTABLE_DATA_DIR_NAME)
    const r = resolveDataLocation({ ...base, env: { PORTABLE_EXECUTABLE_DIR: 'D:\\ReadOnly' }, isWritable: (d) => d !== preferred })
    expect(r.mode).toBe('portable')
    expect(r.dataDir).toBe(join(base.localAppData, PORTABLE_FALLBACK_DIR_NAME))
    expect(r.rejected).toBe(preferred)
  })

  it('throws a clear error when nothing is writable', () => {
    expect(() => resolveDataLocation({ ...base, env: { PORTABLE_EXECUTABLE_DIR: 'D:\\ReadOnly' }, isWritable: () => false })).toThrow(/not writable|writable/i)
  })

  it('honours the explicit CRYPTO_INTELLIGENCE_DATA_DIR override and validates it', () => {
    const r = resolveDataLocation({ ...base, env: { [DATA_DIR_ENV]: 'F:\\ci-data', PORTABLE_EXECUTABLE_DIR: 'E:\\Tools' }, isWritable: writable })
    expect(r).toMatchObject({ mode: 'custom', dataDir: 'F:\\ci-data' })
    expect(() => resolveDataLocation({ ...base, env: { [DATA_DIR_ENV]: 'F:\\nope' }, isWritable: () => false })).toThrow(/not writable/)
  })
})

describe('dataLayout', () => {
  it('keeps the historical flat layout for installed mode', () => {
    const l = dataLayout('C:\\u', 'installed')
    expect(l.dbPath).toBe(join('C:\\u', 'crypto-intelligence.db'))
    expect(l.backupsDir).toBeNull()
  })
  it('uses database/, logs/, cache/ and backups/ sub-folders for portable mode', () => {
    const l = dataLayout('E:\\Tools\\Crypto Intelligence Data', 'portable')
    expect(l.dbPath).toBe(join('E:\\Tools\\Crypto Intelligence Data', 'database', 'crypto-intelligence.db'))
    expect(l.logsDir).toBe(join('E:\\Tools\\Crypto Intelligence Data', 'logs'))
    expect(l.sessionDir).toBe(join('E:\\Tools\\Crypto Intelligence Data', 'cache'))
    expect(l.backupsDir).toBe(join('E:\\Tools\\Crypto Intelligence Data', 'backups'))
  })
})

describe('directoryIsWritable', () => {
  it('creates the directory and confirms a file can be written, leaving no probe behind', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ci-w-'))
    const target = join(dir, 'nested', 'data')
    expect(directoryIsWritable(target)).toBe(true)
    expect(existsSync(target)).toBe(true)
    rmSync(dir, { recursive: true, force: true })
  })
  it('returns false for an unwritable location', () => {
    // A path whose parent is a file cannot be created.
    const dir = mkdtempSync(join(tmpdir(), 'ci-w-'))
    const file = join(dir, 'file')
    writeFileSync(file, 'x')
    chmodSync(file, 0o444)
    expect(directoryIsWritable(join(file, 'child'))).toBe(false)
    rmSync(dir, { recursive: true, force: true })
  })
})
