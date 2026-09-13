import { describe, it, expect } from 'vitest'
import { mkdtempSync, renameSync, rmSync, existsSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openDatabase } from '../electron/main/database/database'
import { dataLayout, resolveDataLocation, directoryIsWritable } from '../electron/main/dataLocation'
import { PortfolioRepository } from '../electron/main/database/repositories/portfolioRepository'
import { JournalRepository } from '../electron/main/database/repositories/journalRepository'
import { AlertRepository } from '../electron/main/database/repositories/alertRepository'
import { PaperRepository } from '../electron/main/database/repositories/paperRepository'
import { SettingsRepository } from '../electron/main/database/repositories/settingsRepository'

/**
 * Simulates the portable life-cycle without launching Electron: the data
 * folder is resolved exactly as main.ts does (from PORTABLE_EXECUTABLE_DIR),
 * data is written, the "app" is restarted, the whole folder is moved together
 * with the executable, and the data must still be there.
 */
describe('portable persistence', () => {
  it('keeps data across restarts and after moving the executable folder', () => {
    const root = mkdtempSync(join(tmpdir(), 'ci-portable-'))
    const exeDirA = join(root, 'USB', 'Tools')
    const exeDirB = join(root, 'Documents', 'Apps')
    const env = { PORTABLE_EXECUTABLE_DIR: exeDirA, PORTABLE_EXECUTABLE_FILE: join(exeDirA, 'Crypto-Intelligence-Portable-0.1.0.exe') }

    // First launch
    const loc1 = resolveDataLocation({ env, defaultUserData: join(root, 'roaming'), localAppData: join(root, 'local'), isWritable: directoryIsWritable })
    expect(loc1.mode).toBe('portable')
    expect(loc1.dataDir).toBe(join(exeDirA, 'Crypto Intelligence Data'))
    const layout1 = dataLayout(loc1.dataDir, 'portable')
    let db = openDatabase(layout1.dbPath)
    expect(existsSync(layout1.dbPath)).toBe(true)
    expect(layout1.dbPath.startsWith(exeDirA)).toBe(true)

    const portfolios = new PortfolioRepository(db)
    const p = portfolios.createPortfolio('Main')
    portfolios.addTransaction({ portfolioId: p.id, assetId: 'bitcoin', type: 'buy', quantity: 0.5, price: 60_000, fee: 3, timestamp: 1_700_000_000_000, notes: 'portable' }, 'BTC')
    new JournalRepository(db).create({ assetId: 'bitcoin', side: 'long', entryPrice: 1, exitPrice: 2, quantity: 1, fees: 0, strategy: 'S', entryReason: '', exitReason: '', emotion: 'calm', notes: '', screenshotPath: '', tags: [], openedAt: 1_700_000_000_000, closedAt: 1_700_000_100_000 }, 'BTC')
    new AlertRepository(db).create({ assetId: 'bitcoin', kind: 'price', direction: 'above', threshold: 1, mode: 'once', note: '' }, 'BTC')
    const paper = new PaperRepository(db)
    const acc = paper.createAccount('Sim', 10_000, 0.001)
    paper.upsertPosition(acc.id, { assetId: 'bitcoin', symbol: 'BTC', side: 'long', quantity: 0.1, entryPrice: 60_000, entryFees: 6, openedAt: 1 })
    new SettingsRepository(db).update({ theme: 'light' })
    db.close()

    // Restart in place
    db = openDatabase(layout1.dbPath)
    expect(new PortfolioRepository(db).listAllTransactions()).toHaveLength(1)
    db.close()

    // WAL side files must be closed cleanly so the folder can be moved as a unit.
    expect(readdirSync(join(loc1.dataDir, 'database')).filter((f) => f.endsWith('-wal') || f.endsWith('-shm'))).toEqual([])

    // Move executable + data folder together, then launch from the new place.
    renameSync(join(root, 'USB'), join(root, 'Documents'))
    renameSync(join(root, 'Documents', 'Tools'), exeDirB)
    const env2 = { PORTABLE_EXECUTABLE_DIR: exeDirB, PORTABLE_EXECUTABLE_FILE: join(exeDirB, 'Crypto-Intelligence-Portable-0.1.0.exe') }
    const loc2 = resolveDataLocation({ env: env2, defaultUserData: join(root, 'roaming'), localAppData: join(root, 'local'), isWritable: directoryIsWritable })
    const layout2 = dataLayout(loc2.dataDir, 'portable')
    expect(layout2.dbPath.startsWith(exeDirB)).toBe(true)
    db = openDatabase(layout2.dbPath)
    expect(new PortfolioRepository(db).listAllTransactions()[0]?.notes).toBe('portable')
    expect(new JournalRepository(db).list()).toHaveLength(1)
    expect(new AlertRepository(db).list()).toHaveLength(1)
    expect(new PaperRepository(db).listPositions(acc.id)).toHaveLength(1)
    expect(new SettingsRepository(db).get().theme).toBe('light')
    db.close()

    // Nothing was written to the per-user locations.
    expect(existsSync(join(root, 'roaming'))).toBe(false)
    expect(existsSync(join(root, 'local'))).toBe(false)
    rmSync(root, { recursive: true, force: true })
  })
})
