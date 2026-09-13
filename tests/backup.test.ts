import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const { dialogMock } = vi.hoisted(() => ({ dialogMock: { showOpenDialog: vi.fn(), showSaveDialog: vi.fn() } }))
vi.mock('electron', () => ({ app: { getVersion: () => '0.1.0-test' }, dialog: dialogMock, BrowserWindow: class {} }))

import { openDatabase, type AppDatabase } from '../electron/main/database/database'
import { SettingsRepository } from '../electron/main/database/repositories/settingsRepository'
import { WatchlistRepository } from '../electron/main/database/repositories/watchlistRepository'
import { ScreenRepository } from '../electron/main/database/repositories/screenRepository'
import { PortfolioRepository } from '../electron/main/database/repositories/portfolioRepository'
import { PaperRepository } from '../electron/main/database/repositories/paperRepository'
import { JournalRepository } from '../electron/main/database/repositories/journalRepository'
import { AlertRepository } from '../electron/main/database/repositories/alertRepository'
import { MarketCacheRepository } from '../electron/main/database/repositories/marketCacheRepository'
import { BackupService, toCsv } from '../electron/main/services/backupService'
import type { AppContext } from '../electron/main/context'

function makeCtx(db: AppDatabase): AppContext {
  const repos = {
    settings: new SettingsRepository(db),
    marketCache: new MarketCacheRepository(db),
    watchlists: new WatchlistRepository(db),
    screens: new ScreenRepository(db),
    portfolios: new PortfolioRepository(db),
    paper: new PaperRepository(db),
    journal: new JournalRepository(db),
    alerts: new AlertRepository(db)
  }
  return { paths: { userData: '', dataDir: '', dbPath: '', logDir: '', logPath: '', backupsDir: null, mode: 'installed', portableExecutable: null }, db, repos, services: {} as AppContext['services'] }
}

describe('BackupService', () => {
  let dir: string
  let db: AppDatabase
  let ctx: AppContext
  let svc: BackupService

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'ci-bk-'))
    db = openDatabase(join(dir, 'b.db'))
    ctx = makeCtx(db)
    svc = new BackupService(ctx, () => null)
    const w = ctx.repos.watchlists.create('Trading')
    ctx.repos.watchlists.addItem(w.id, 'bitcoin', 'BTC')
    const p = ctx.repos.portfolios.createPortfolio('Main')
    ctx.repos.portfolios.addTransaction({ portfolioId: p.id, assetId: 'bitcoin', type: 'buy', quantity: 1, price: 50_000, fee: 5, timestamp: 1_700_000_000_000, notes: 'note, with "quotes"' }, 'BTC')
    ctx.repos.journal.create({ assetId: 'bitcoin', side: 'long', entryPrice: 1, exitPrice: 2, quantity: 1, fees: 0, strategy: 'S', entryReason: '', exitReason: '', emotion: 'calm', notes: '', screenshotPath: '', tags: [], openedAt: 1_700_000_000_000, closedAt: 1_700_000_100_000 }, 'BTC')
    ctx.repos.alerts.create({ assetId: 'bitcoin', kind: 'price', direction: 'above', threshold: 1, mode: 'once', note: '' }, 'BTC')
    ctx.repos.settings.update({ theme: 'light' })
  })
  afterEach(() => {
    db.close()
    rmSync(dir, { recursive: true, force: true })
  })

  it('builds a complete backup', () => {
    const b = svc.buildBackup()
    expect(b.app).toBe('crypto-intelligence')
    expect(b.settings.theme).toBe('light')
    expect(b.watchlists[0]?.items[0]?.assetId).toBe('bitcoin')
    expect(b.transactions).toHaveLength(1)
    expect(b.journal).toHaveLength(1)
    expect(b.alerts).toHaveLength(1)
  })

  it('exports CSV with proper escaping', () => {
    const csv = svc.csvFor('transactions')
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv).toContain('"note, with ""quotes"""')
    expect(csv.split('\r\n')[0]).toBe('﻿portfolio,date,type,asset,symbol,quantity,price_usd,fee_usd,notes')
    expect(svc.csvFor('holdings')).toContain('Main,bitcoin,BTC,1,50005')
    expect(toCsv(['a'], [[null], [undefined], ['x\ny']])).toContain('"x\ny"')
  })

  it('validates, previews and merges / replaces an import', async () => {
    const file = join(dir, 'backup.json')
    writeFileSync(file, JSON.stringify(svc.buildBackup()))
    dialogMock.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: [file] })

    const summary = await svc.pickImport()
    expect(summary?.counts.transactions).toBe(1)
    // Merge: doubles the rows.
    svc.applyImport('merge')
    expect(ctx.repos.portfolios.listAllTransactions()).toHaveLength(2)
    expect(ctx.repos.watchlists.list()).toHaveLength(2)

    // Replace: back to exactly the backup contents.
    await svc.pickImport()
    svc.applyImport('replace')
    expect(ctx.repos.portfolios.listAllTransactions()).toHaveLength(1)
    expect(ctx.repos.watchlists.list()).toHaveLength(1)
    expect(ctx.repos.journal.list()).toHaveLength(1)
    expect(ctx.repos.alerts.list()).toHaveLength(1)
    expect(() => svc.applyImport('merge')).toThrow(/no backup/i)
  })

  it('rejects invalid files without touching the database', async () => {
    const bad = join(dir, 'bad.json')
    writeFileSync(bad, JSON.stringify({ app: 'other', schemaVersion: 1 }))
    dialogMock.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: [bad] })
    await expect(svc.pickImport()).rejects.toThrow(/not a valid/i)
    writeFileSync(bad, '{not json')
    await expect(svc.pickImport()).rejects.toThrow(/valid JSON/i)
    expect(ctx.repos.portfolios.listAllTransactions()).toHaveLength(1)
    dialogMock.showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] })
    expect(await svc.pickImport()).toBeNull()
  })

  it('writes the JSON export through the save dialog', async () => {
    const out = join(dir, 'out.json')
    dialogMock.showSaveDialog.mockResolvedValue({ canceled: false, filePath: out })
    expect(await svc.exportJson()).toBe(out)
    expect(JSON.parse(readFileSync(out, 'utf8')).app).toBe('crypto-intelligence')
    dialogMock.showSaveDialog.mockResolvedValue({ canceled: true })
    expect(await svc.exportJson()).toBeNull()
  })
})
