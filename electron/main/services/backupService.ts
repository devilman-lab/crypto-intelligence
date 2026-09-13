import { app, dialog, type BrowserWindow } from 'electron'
import { readFile, writeFile } from 'node:fs/promises'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import type { AppContext } from '../context'
import type { BackupFile, BackupSummary, CsvDataset, ImportMode } from '@shared/types'
import { BACKUP_SCHEMA_VERSION } from '@shared/types'
import { deriveHoldings } from '@shared/analysis/portfolio'
import { AppError, ErrorCodes } from '../errors'
import { createLogger } from '../logger'

const log = createLogger('backup')
const MAX_IMPORT_BYTES = 200 * 1024 * 1024

// ---------- validation schema for imports ----------
const ts = z.number().int()
const settingsSchema = z
  .object({
    theme: z.enum(['dark', 'light', 'system']),
    marketDataProvider: z.enum(['coingecko', 'binance']),
    refreshIntervalSec: z.number().int().min(15).max(3600),
    currency: z.enum(['USD', 'EUR', 'GBP', 'JPY']),
    notificationsEnabled: z.boolean(),
    aiModuleEnabled: z.boolean()
  })
  .partial()
const watchlistSchema = z.object({ id: z.number().int(), name: z.string().min(1).max(60), createdAt: ts, items: z.array(z.object({ assetId: z.string().min(1).max(128), symbol: z.string().max(32), position: z.number().int(), addedAt: ts })).max(1000) })
const screenSchema = z.object({ id: z.number().int(), name: z.string().min(1).max(60), definition: z.object({ logic: z.enum(['and', 'or']), conditions: z.array(z.object({ id: z.string().max(40), field: z.string().max(40), op: z.enum(['gt', 'lt', 'gte', 'lte', 'between']), value: z.number().finite(), value2: z.number().finite().optional() })).max(20) }), createdAt: ts, updatedAt: ts })
const portfolioSchema = z.object({ id: z.number().int(), name: z.string().min(1).max(60), createdAt: ts })
const transactionSchema = z.object({ id: z.number().int(), portfolioId: z.number().int(), assetId: z.string().min(1).max(128), symbol: z.string().max(32), type: z.enum(['buy', 'sell', 'deposit', 'withdrawal']), quantity: z.number().finite().nonnegative(), price: z.number().finite().nonnegative(), fee: z.number().finite().nonnegative(), timestamp: ts, notes: z.string().max(2000) })
const paperAccountSchema = z.object({ id: z.number().int(), name: z.string().max(60), startingBalance: z.number().finite().positive(), cash: z.number().finite(), feeRate: z.number().finite().min(0).max(0.05), createdAt: ts, resetAt: ts })
const paperPositionSchema = z.object({ id: z.number().int(), accountId: z.number().int(), assetId: z.string().min(1).max(128), symbol: z.string().max(32), side: z.enum(['long', 'short']), quantity: z.number().finite().positive(), entryPrice: z.number().finite().positive(), entryFees: z.number().finite().nonnegative(), openedAt: ts })
const paperTradeSchema = z.object({ id: z.number().int(), accountId: z.number().int(), assetId: z.string().min(1).max(128), symbol: z.string().max(32), side: z.enum(['long', 'short']), quantity: z.number().finite().positive(), entryPrice: z.number().finite(), exitPrice: z.number().finite(), fees: z.number().finite(), pnl: z.number().finite(), roiPct: z.number().finite(), openedAt: ts, closedAt: ts })
const journalSchema = z.object({ id: z.number().int(), assetId: z.string().min(1).max(128), symbol: z.string().max(32), side: z.enum(['long', 'short']), entryPrice: z.number().finite().nonnegative(), exitPrice: z.number().finite().nonnegative().nullable(), quantity: z.number().finite().positive(), fees: z.number().finite().nonnegative(), strategy: z.string().max(80), entryReason: z.string().max(4000), exitReason: z.string().max(4000), result: z.enum(['win', 'loss', 'breakeven', 'open']), emotion: z.string().max(20), notes: z.string().max(10_000), screenshotPath: z.string().max(1024), tags: z.array(z.string().max(40)).max(20), openedAt: ts, closedAt: ts.nullable(), createdAt: ts, updatedAt: ts, pnl: z.number().finite().nullable() })
const alertSchema = z.object({ id: z.number().int(), assetId: z.string().min(1).max(128), symbol: z.string().max(32), kind: z.enum(['price', 'change24h', 'volatility', 'volume', 'rsi']), direction: z.enum(['above', 'below']), threshold: z.number().finite(), mode: z.enum(['once', 'repeating']), enabled: z.boolean(), armed: z.boolean(), lastTriggeredAt: ts.nullable(), triggerCount: z.number().int().nonnegative(), note: z.string().max(500), createdAt: ts })

const backupSchema = z.object({
  app: z.literal('crypto-intelligence'),
  schemaVersion: z.number().int().min(1).max(BACKUP_SCHEMA_VERSION),
  appVersion: z.string().max(40),
  exportedAt: ts,
  settings: settingsSchema,
  watchlists: z.array(watchlistSchema).max(500),
  screens: z.array(screenSchema).max(500),
  portfolios: z.array(portfolioSchema).max(500),
  transactions: z.array(transactionSchema).max(100_000),
  paperAccounts: z.array(paperAccountSchema).max(50),
  paperPositions: z.array(paperPositionSchema).max(5000),
  paperTrades: z.array(paperTradeSchema).max(100_000),
  journal: z.array(journalSchema).max(100_000),
  alerts: z.array(alertSchema).max(5000)
})

type ValidBackup = z.infer<typeof backupSchema>

/**
 * Local backup, export and restore. All file access happens here in the main
 * process through native dialogs; the renderer never sees a path it did not
 * pick. Imports are validated before a single row is written and applied in
 * one transaction so a failure leaves the database untouched.
 */
export class BackupService {
  private pendingImport: { path: string; data: ValidBackup } | null = null

  constructor(
    private readonly ctx: AppContext,
    private readonly getWindow: () => BrowserWindow | null
  ) {}

  private saveDialog(opts: Electron.SaveDialogOptions): Promise<Electron.SaveDialogReturnValue> {
    // Portable mode: suggest the backups folder inside the data directory so exports travel with the executable.
    const backupsDir = this.ctx.paths.backupsDir
    if (backupsDir && opts.defaultPath && !/[\\/]/.test(opts.defaultPath)) {
      try {
        mkdirSync(backupsDir, { recursive: true })
        opts = { ...opts, defaultPath: join(backupsDir, opts.defaultPath) }
      } catch {
        /* fall back to the OS default location */
      }
    }
    const win = this.getWindow()
    return win ? dialog.showSaveDialog(win, opts) : dialog.showSaveDialog(opts)
  }

  // ---------- export ----------

  buildBackup(): BackupFile {
    const { repos } = this.ctx
    const accounts = repos.paper.listAccounts()
    return {
      app: 'crypto-intelligence',
      schemaVersion: BACKUP_SCHEMA_VERSION,
      appVersion: app.getVersion(),
      exportedAt: Date.now(),
      settings: repos.settings.get(),
      watchlists: repos.watchlists.list(),
      screens: repos.screens.list(),
      portfolios: repos.portfolios.listPortfolios(),
      transactions: repos.portfolios.listAllTransactions(),
      paperAccounts: accounts,
      paperPositions: accounts.flatMap((a) => repos.paper.listPositions(a.id)),
      paperTrades: accounts.flatMap((a) => repos.paper.listTrades(a.id)),
      journal: repos.journal.list(),
      alerts: repos.alerts.list()
    }
  }

  async exportJson(): Promise<string | null> {
    const { canceled, filePath } = await this.saveDialog({
      title: 'Export backup',
      defaultPath: `crypto-intelligence-backup-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (canceled || !filePath) return null
    await writeFile(filePath, JSON.stringify(this.buildBackup(), null, 2), 'utf8')
    log.info(`backup exported to ${filePath}`)
    return filePath
  }

  async exportCsv(dataset: CsvDataset): Promise<string | null> {
    const { canceled, filePath } = await this.saveDialog({
      title: `Export ${dataset} as CSV`,
      defaultPath: `crypto-intelligence-${dataset}-${new Date().toISOString().slice(0, 10)}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }]
    })
    if (canceled || !filePath) return null
    await writeFile(filePath, this.csvFor(dataset), 'utf8')
    log.info(`${dataset} exported to ${filePath}`)
    return filePath
  }

  csvFor(dataset: CsvDataset): string {
    const { repos } = this.ctx
    const iso = (t: number | null) => (t == null ? '' : new Date(t).toISOString())
    switch (dataset) {
      case 'transactions': {
        const names = new Map(repos.portfolios.listPortfolios().map((p) => [p.id, p.name]))
        return toCsv(['portfolio', 'date', 'type', 'asset', 'symbol', 'quantity', 'price_usd', 'fee_usd', 'notes'], repos.portfolios.listAllTransactions().map((t) => [names.get(t.portfolioId) ?? t.portfolioId, iso(t.timestamp), t.type, t.assetId, t.symbol, t.quantity, t.price, t.fee, t.notes]))
      }
      case 'holdings': {
        const names = new Map(repos.portfolios.listPortfolios().map((p) => [p.id, p.name]))
        const rows: (string | number)[][] = []
        for (const [pid, name] of names) for (const h of deriveHoldings(repos.portfolios.listTransactions(pid))) if (h.quantity > 0) rows.push([name, h.assetId, h.symbol, h.quantity, h.averageCost, h.costBasis, h.realizedPnl, h.fees])
        return toCsv(['portfolio', 'asset', 'symbol', 'quantity', 'average_cost_usd', 'cost_basis_usd', 'realized_pnl_usd', 'fees_usd'], rows)
      }
      case 'journal':
        return toCsv(['opened', 'closed', 'asset', 'symbol', 'side', 'entry_price', 'exit_price', 'quantity', 'fees_usd', 'pnl_usd', 'result', 'strategy', 'emotion', 'entry_reason', 'exit_reason', 'notes', 'tags'], repos.journal.list().map((e) => [iso(e.openedAt), iso(e.closedAt), e.assetId, e.symbol, e.side, e.entryPrice, e.exitPrice ?? '', e.quantity, e.fees, e.pnl ?? '', e.result, e.strategy, e.emotion, e.entryReason, e.exitReason, e.notes, e.tags.join('|')]))
      case 'paperTrades':
        return toCsv(['opened', 'closed', 'asset', 'symbol', 'side', 'quantity', 'entry_price', 'exit_price', 'fees_usd', 'pnl_usd', 'roi_pct'], repos.paper.listAccounts().flatMap((a) => repos.paper.listTrades(a.id)).map((t) => [iso(t.openedAt), iso(t.closedAt), t.assetId, t.symbol, t.side, t.quantity, t.entryPrice, t.exitPrice, t.fees, t.pnl, t.roiPct]))
    }
  }

  // ---------- import ----------

  /** Opens a file picker, validates the backup and returns a summary; nothing is written yet. */
  async pickImport(): Promise<BackupSummary | null> {
    const opts: Electron.OpenDialogOptions = { title: 'Restore backup', filters: [{ name: 'JSON', extensions: ['json'] }], properties: ['openFile'] }
    const win = this.getWindow()
    const { canceled, filePaths } = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts)
    const path = filePaths[0]
    if (canceled || !path) return null
    const raw = await readFile(path)
    if (raw.byteLength > MAX_IMPORT_BYTES) throw new AppError(ErrorCodes.VALIDATION, 'The backup file is too large.')
    let json: unknown
    try {
      json = JSON.parse(raw.toString('utf8'))
    } catch {
      throw new AppError(ErrorCodes.VALIDATION, 'The file is not valid JSON.')
    }
    const parsed = backupSchema.safeParse(json)
    if (!parsed.success) {
      log.warn(`invalid backup: ${parsed.error.issues[0]?.path.join('.')}: ${parsed.error.issues[0]?.message}`)
      throw new AppError(ErrorCodes.VALIDATION, 'This file is not a valid Crypto Intelligence backup.')
    }
    this.pendingImport = { path, data: parsed.data }
    return summarize(parsed.data)
  }

  /** Applies the previously validated backup. `replace` wipes user data first. */
  applyImport(mode: ImportMode): BackupSummary {
    const pending = this.pendingImport
    if (!pending) throw new AppError(ErrorCodes.VALIDATION, 'No backup has been selected.')
    const { data } = pending
    const db = this.ctx.db
    const { repos } = this.ctx

    db.transaction(() => {
      if (mode === 'replace') {
        for (const table of ['alert_triggers', 'alerts', 'journal_entries', 'paper_trades', 'paper_positions', 'paper_accounts', 'transactions', 'portfolios', 'screens', 'watchlist_items', 'watchlists']) db.prepare(`DELETE FROM ${table}`).run()
      }
      repos.settings.update(data.settings)
      for (const w of data.watchlists) {
        const created = repos.watchlists.create(w.name)
        for (const item of [...w.items].sort((a, b) => a.position - b.position)) repos.watchlists.addItem(created.id, item.assetId, item.symbol)
      }
      for (const s of data.screens) repos.screens.create(s.name, s.definition as never)
      const portfolioMap = new Map<number, number>()
      for (const p of data.portfolios) portfolioMap.set(p.id, repos.portfolios.createPortfolio(p.name).id)
      for (const t of data.transactions) {
        const pid = portfolioMap.get(t.portfolioId)
        if (pid) repos.portfolios.addTransaction({ ...t, portfolioId: pid }, t.symbol)
      }
      const accountMap = new Map<number, number>()
      for (const a of data.paperAccounts) {
        const created = repos.paper.createAccount(a.name, a.startingBalance, a.feeRate)
        repos.paper.setCash(created.id, a.cash)
        accountMap.set(a.id, created.id)
      }
      for (const p of data.paperPositions) {
        const aid = accountMap.get(p.accountId)
        if (aid) repos.paper.upsertPosition(aid, p)
      }
      for (const t of data.paperTrades) {
        const aid = accountMap.get(t.accountId)
        if (aid) repos.paper.addTrade(aid, t)
      }
      for (const e of data.journal) repos.journal.create({ ...e, emotion: e.emotion as never }, e.symbol)
      for (const a of data.alerts) {
        const created = repos.alerts.create(a, a.symbol)
        repos.alerts.saveState({ ...created, enabled: a.enabled, armed: a.armed, lastTriggeredAt: a.lastTriggeredAt, triggerCount: a.triggerCount })
      }
    })()

    this.pendingImport = null
    log.info(`backup restored (${mode}) from ${pending.path}`)
    return summarize(data)
  }

  cancelImport(): void {
    this.pendingImport = null
  }
}

function summarize(b: ValidBackup): BackupSummary {
  return {
    appVersion: b.appVersion,
    exportedAt: b.exportedAt,
    counts: {
      watchlists: b.watchlists.length,
      screens: b.screens.length,
      portfolios: b.portfolios.length,
      transactions: b.transactions.length,
      paperAccounts: b.paperAccounts.length,
      paperTrades: b.paperTrades.length,
      journal: b.journal.length,
      alerts: b.alerts.length
    }
  }
}

/** RFC 4180-style CSV with a UTF-8 BOM so Excel opens it correctly. */
export function toCsv(header: string[], rows: (string | number | null | undefined)[][]): string {
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v)
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return '﻿' + [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n') + '\r\n'
}
