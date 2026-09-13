import type { AppDatabase } from '../database'
import type { Portfolio, Transaction, TransactionInput } from '@shared/types'
import { AppError, ErrorCodes } from '../../errors'

interface PRow {
  id: number
  name: string
  created_at: number
}
interface TRow {
  id: number
  portfolio_id: number
  asset_id: string
  symbol: string
  type: Transaction['type']
  quantity: number
  price: number
  fee: number
  timestamp: number
  notes: string
}

const toTx = (r: TRow): Transaction => ({
  id: r.id,
  portfolioId: r.portfolio_id,
  assetId: r.asset_id,
  symbol: r.symbol,
  type: r.type,
  quantity: r.quantity,
  price: r.price,
  fee: r.fee,
  timestamp: r.timestamp,
  notes: r.notes
})

export class PortfolioRepository {
  constructor(private readonly db: AppDatabase) {}

  listPortfolios(): Portfolio[] {
    return (this.db.prepare('SELECT * FROM portfolios ORDER BY id').all() as PRow[]).map((r) => ({ id: r.id, name: r.name, createdAt: r.created_at }))
  }

  createPortfolio(name: string): Portfolio {
    const res = this.db.prepare('INSERT INTO portfolios (name, created_at) VALUES (?, ?)').run(name, Date.now())
    return this.getPortfolio(Number(res.lastInsertRowid))
  }

  renamePortfolio(id: number, name: string): Portfolio {
    this.db.prepare('UPDATE portfolios SET name = ? WHERE id = ?').run(name, id)
    return this.getPortfolio(id)
  }

  deletePortfolio(id: number): void {
    this.db.prepare('DELETE FROM portfolios WHERE id = ?').run(id)
  }

  listTransactions(portfolioId: number): Transaction[] {
    return (this.db.prepare('SELECT * FROM transactions WHERE portfolio_id = ? ORDER BY timestamp DESC, id DESC').all(portfolioId) as TRow[]).map(toTx)
  }

  listAllTransactions(): Transaction[] {
    return (this.db.prepare('SELECT * FROM transactions ORDER BY timestamp DESC, id DESC').all() as TRow[]).map(toTx)
  }

  addTransaction(input: TransactionInput, symbol: string): Transaction {
    this.getPortfolio(input.portfolioId)
    const res = this.db
      .prepare('INSERT INTO transactions (portfolio_id, asset_id, symbol, type, quantity, price, fee, timestamp, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(input.portfolioId, input.assetId, symbol, input.type, input.quantity, input.price, input.fee, input.timestamp, input.notes)
    return this.getTransaction(Number(res.lastInsertRowid))
  }

  updateTransaction(id: number, input: TransactionInput, symbol: string): Transaction {
    this.getTransaction(id)
    this.db
      .prepare('UPDATE transactions SET asset_id = ?, symbol = ?, type = ?, quantity = ?, price = ?, fee = ?, timestamp = ?, notes = ? WHERE id = ?')
      .run(input.assetId, symbol, input.type, input.quantity, input.price, input.fee, input.timestamp, input.notes, id)
    return this.getTransaction(id)
  }

  deleteTransaction(id: number): void {
    this.db.prepare('DELETE FROM transactions WHERE id = ?').run(id)
  }

  private getPortfolio(id: number): Portfolio {
    const r = this.db.prepare('SELECT * FROM portfolios WHERE id = ?').get(id) as PRow | undefined
    if (!r) throw new AppError(ErrorCodes.NOT_FOUND, 'Portfolio not found.')
    return { id: r.id, name: r.name, createdAt: r.created_at }
  }

  private getTransaction(id: number): Transaction {
    const r = this.db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as TRow | undefined
    if (!r) throw new AppError(ErrorCodes.NOT_FOUND, 'Transaction not found.')
    return toTx(r)
  }
}
