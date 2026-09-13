import type { AppDatabase } from '../database'
import type { JournalEntry, JournalEntryInput } from '@shared/types'
import { journalPnl, journalResult } from '@shared/analysis/journal'
import { AppError, ErrorCodes } from '../../errors'

interface Row {
  id: number
  asset_id: string
  symbol: string
  side: 'long' | 'short'
  entry_price: number
  exit_price: number | null
  quantity: number
  fees: number
  strategy: string
  entry_reason: string
  exit_reason: string
  result: JournalEntry['result']
  emotion: JournalEntry['emotion']
  notes: string
  screenshot_path: string
  tags: string
  opened_at: number
  closed_at: number | null
  pnl: number | null
  created_at: number
  updated_at: number
}

function toEntry(r: Row): JournalEntry {
  let tags: string[] = []
  try {
    const parsed = JSON.parse(r.tags)
    if (Array.isArray(parsed)) tags = parsed.filter((t): t is string => typeof t === 'string')
  } catch {
    /* ignore corrupt tags */
  }
  return {
    id: r.id,
    assetId: r.asset_id,
    symbol: r.symbol,
    side: r.side,
    entryPrice: r.entry_price,
    exitPrice: r.exit_price,
    quantity: r.quantity,
    fees: r.fees,
    strategy: r.strategy,
    entryReason: r.entry_reason,
    exitReason: r.exit_reason,
    result: r.result,
    emotion: r.emotion,
    notes: r.notes,
    screenshotPath: r.screenshot_path,
    tags,
    openedAt: r.opened_at,
    closedAt: r.closed_at,
    pnl: r.pnl,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }
}

export class JournalRepository {
  constructor(private readonly db: AppDatabase) {}

  list(): JournalEntry[] {
    return (this.db.prepare('SELECT * FROM journal_entries ORDER BY opened_at DESC, id DESC').all() as Row[]).map(toEntry)
  }

  get(id: number): JournalEntry {
    const r = this.db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(id) as Row | undefined
    if (!r) throw new AppError(ErrorCodes.NOT_FOUND, 'Journal entry not found.')
    return toEntry(r)
  }

  create(input: JournalEntryInput, symbol: string): JournalEntry {
    const now = Date.now()
    const pnl = journalPnl(input)
    const res = this.db
      .prepare(
        `INSERT INTO journal_entries (asset_id, symbol, side, entry_price, exit_price, quantity, fees, strategy, entry_reason, exit_reason, result, emotion, notes, screenshot_path, tags, opened_at, closed_at, pnl, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(input.assetId, symbol, input.side, input.entryPrice, input.exitPrice, input.quantity, input.fees, input.strategy, input.entryReason, input.exitReason, journalResult(pnl), input.emotion, input.notes, input.screenshotPath, JSON.stringify(input.tags), input.openedAt, input.closedAt, pnl, now, now)
    return this.get(Number(res.lastInsertRowid))
  }

  update(id: number, input: JournalEntryInput, symbol: string): JournalEntry {
    this.get(id)
    const pnl = journalPnl(input)
    this.db
      .prepare(
        `UPDATE journal_entries SET asset_id = ?, symbol = ?, side = ?, entry_price = ?, exit_price = ?, quantity = ?, fees = ?, strategy = ?, entry_reason = ?, exit_reason = ?, result = ?, emotion = ?, notes = ?, screenshot_path = ?, tags = ?, opened_at = ?, closed_at = ?, pnl = ?, updated_at = ? WHERE id = ?`
      )
      .run(input.assetId, symbol, input.side, input.entryPrice, input.exitPrice, input.quantity, input.fees, input.strategy, input.entryReason, input.exitReason, journalResult(pnl), input.emotion, input.notes, input.screenshotPath, JSON.stringify(input.tags), input.openedAt, input.closedAt, pnl, Date.now(), id)
    return this.get(id)
  }

  delete(id: number): void {
    this.db.prepare('DELETE FROM journal_entries WHERE id = ?').run(id)
  }

  /** Distinct strategy names for filter dropdowns. */
  strategies(): string[] {
    return (this.db.prepare("SELECT DISTINCT strategy FROM journal_entries WHERE strategy <> '' ORDER BY strategy COLLATE NOCASE").all() as { strategy: string }[]).map((r) => r.strategy)
  }
}
