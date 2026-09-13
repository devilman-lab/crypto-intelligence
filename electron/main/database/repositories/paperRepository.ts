import type { AppDatabase } from '../database'
import type { PaperAccount, PaperPosition, PaperTrade } from '@shared/types'
import { AppError, ErrorCodes } from '../../errors'

interface ARow { id: number; name: string; starting_balance: number; cash: number; fee_rate: number; created_at: number; reset_at: number }
interface PRow { id: number; account_id: number; asset_id: string; symbol: string; side: 'long' | 'short'; quantity: number; entry_price: number; entry_fees: number; opened_at: number }
interface TRow { id: number; account_id: number; asset_id: string; symbol: string; side: 'long' | 'short'; quantity: number; entry_price: number; exit_price: number; fees: number; pnl: number; roi_pct: number; opened_at: number; closed_at: number }

const toAccount = (r: ARow): PaperAccount => ({ id: r.id, name: r.name, startingBalance: r.starting_balance, cash: r.cash, feeRate: r.fee_rate, createdAt: r.created_at, resetAt: r.reset_at })
const toPosition = (r: PRow): PaperPosition => ({ id: r.id, accountId: r.account_id, assetId: r.asset_id, symbol: r.symbol, side: r.side, quantity: r.quantity, entryPrice: r.entry_price, entryFees: r.entry_fees, openedAt: r.opened_at })
const toTrade = (r: TRow): PaperTrade => ({ id: r.id, accountId: r.account_id, assetId: r.asset_id, symbol: r.symbol, side: r.side, quantity: r.quantity, entryPrice: r.entry_price, exitPrice: r.exit_price, fees: r.fees, pnl: r.pnl, roiPct: r.roi_pct, openedAt: r.opened_at, closedAt: r.closed_at })

export class PaperRepository {
  constructor(readonly db: AppDatabase) {}

  listAccounts(): PaperAccount[] {
    return (this.db.prepare('SELECT * FROM paper_accounts ORDER BY id').all() as ARow[]).map(toAccount)
  }

  getAccount(id: number): PaperAccount {
    const r = this.db.prepare('SELECT * FROM paper_accounts WHERE id = ?').get(id) as ARow | undefined
    if (!r) throw new AppError(ErrorCodes.NOT_FOUND, 'Paper account not found.')
    return toAccount(r)
  }

  createAccount(name: string, startingBalance: number, feeRate: number): PaperAccount {
    const now = Date.now()
    const res = this.db.prepare('INSERT INTO paper_accounts (name, starting_balance, cash, fee_rate, created_at, reset_at) VALUES (?, ?, ?, ?, ?, ?)').run(name, startingBalance, startingBalance, feeRate, now, now)
    return this.getAccount(Number(res.lastInsertRowid))
  }

  /** Wipes positions and trades and restores the starting balance (optionally a new one). */
  resetAccount(id: number, startingBalance?: number, feeRate?: number): PaperAccount {
    const a = this.getAccount(id)
    const balance = startingBalance ?? a.startingBalance
    this.db.transaction(() => {
      this.db.prepare('DELETE FROM paper_positions WHERE account_id = ?').run(id)
      this.db.prepare('DELETE FROM paper_trades WHERE account_id = ?').run(id)
      this.db.prepare('UPDATE paper_accounts SET starting_balance = ?, cash = ?, fee_rate = ?, reset_at = ? WHERE id = ?').run(balance, balance, feeRate ?? a.feeRate, Date.now(), id)
    })()
    return this.getAccount(id)
  }

  setCash(id: number, cash: number): void {
    this.db.prepare('UPDATE paper_accounts SET cash = ? WHERE id = ?').run(cash, id)
  }

  listPositions(accountId: number): PaperPosition[] {
    return (this.db.prepare('SELECT * FROM paper_positions WHERE account_id = ? ORDER BY opened_at').all(accountId) as PRow[]).map(toPosition)
  }

  getPosition(id: number): PaperPosition {
    const r = this.db.prepare('SELECT * FROM paper_positions WHERE id = ?').get(id) as PRow | undefined
    if (!r) throw new AppError(ErrorCodes.NOT_FOUND, 'Position not found.')
    return toPosition(r)
  }

  findPosition(accountId: number, assetId: string): PaperPosition | undefined {
    const r = this.db.prepare('SELECT * FROM paper_positions WHERE account_id = ? AND asset_id = ?').get(accountId, assetId) as PRow | undefined
    return r ? toPosition(r) : undefined
  }

  upsertPosition(accountId: number, p: Omit<PaperPosition, 'id' | 'accountId'>, existingId?: number): PaperPosition {
    if (existingId) {
      this.db.prepare('UPDATE paper_positions SET quantity = ?, entry_price = ?, entry_fees = ? WHERE id = ?').run(p.quantity, p.entryPrice, p.entryFees, existingId)
      return this.getPosition(existingId)
    }
    const res = this.db
      .prepare('INSERT INTO paper_positions (account_id, asset_id, symbol, side, quantity, entry_price, entry_fees, opened_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(accountId, p.assetId, p.symbol, p.side, p.quantity, p.entryPrice, p.entryFees, p.openedAt)
    return this.getPosition(Number(res.lastInsertRowid))
  }

  deletePosition(id: number): void {
    this.db.prepare('DELETE FROM paper_positions WHERE id = ?').run(id)
  }

  listTrades(accountId: number): PaperTrade[] {
    return (this.db.prepare('SELECT * FROM paper_trades WHERE account_id = ? ORDER BY closed_at DESC, id DESC').all(accountId) as TRow[]).map(toTrade)
  }

  addTrade(accountId: number, t: Omit<PaperTrade, 'id' | 'accountId'>): PaperTrade {
    const res = this.db
      .prepare('INSERT INTO paper_trades (account_id, asset_id, symbol, side, quantity, entry_price, exit_price, fees, pnl, roi_pct, opened_at, closed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(accountId, t.assetId, t.symbol, t.side, t.quantity, t.entryPrice, t.exitPrice, t.fees, t.pnl, t.roiPct, t.openedAt, t.closedAt)
    const r = this.db.prepare('SELECT * FROM paper_trades WHERE id = ?').get(Number(res.lastInsertRowid)) as TRow
    return toTrade(r)
  }
}
