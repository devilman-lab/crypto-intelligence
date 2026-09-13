import type { PaperAccount, PaperCloseInput, PaperOrderInput, PaperSnapshot } from '@shared/types'
import { closePosition, openPosition } from '@shared/analysis/paperTrading'
import type { PaperRepository } from '../database/repositories/paperRepository'
import type { MarketService } from '../market/marketService'
import { AppError, ErrorCodes } from '../errors'
import { createLogger } from '../logger'

const log = createLogger('paper')
const DEFAULT_BALANCE = 10_000
const DEFAULT_FEE = 0.001
/** Refuse to fill against a price older than this. */
const MAX_PRICE_AGE_MS = 15 * 60_000

/**
 * Executes simulated orders. Fills always use the latest ticker held by the
 * main process — never a price supplied by the renderer — and every mutation
 * runs inside a SQLite transaction. This module has no connection to any
 * exchange; it only ever writes to the local database.
 */
export class PaperTradingService {
  constructor(
    private readonly repo: PaperRepository,
    private readonly market: MarketService
  ) {}

  ensureDefaultAccount(): PaperAccount {
    const existing = this.repo.listAccounts()[0]
    return existing ?? this.repo.createAccount('Simulation', DEFAULT_BALANCE, DEFAULT_FEE)
  }

  getSnapshot(accountId: number): PaperSnapshot {
    return { account: this.repo.getAccount(accountId), positions: this.repo.listPositions(accountId), trades: this.repo.listTrades(accountId) }
  }

  reset(accountId: number, startingBalance?: number, feeRate?: number): PaperSnapshot {
    this.repo.resetAccount(accountId, startingBalance, feeRate)
    log.info(`account ${accountId} reset`)
    return this.getSnapshot(accountId)
  }

  private currentPrice(assetId: string): { price: number; symbol: string } {
    const ticker = this.market.getSnapshot().tickers.find((t) => t.assetId === assetId)
    if (!ticker) throw new AppError(ErrorCodes.NOT_FOUND, 'No market price available for this asset.')
    const age = Date.now() - (this.market.getSnapshot().updatedAt ?? 0)
    if (this.market.getSnapshot().stale && age > MAX_PRICE_AGE_MS) {
      throw new AppError(ErrorCodes.NETWORK, 'Live prices are unavailable; simulated orders are paused while offline.')
    }
    return { price: ticker.price, symbol: ticker.symbol }
  }

  open(input: PaperOrderInput): PaperSnapshot {
    const account = this.repo.getAccount(input.accountId)
    const { price, symbol } = this.currentPrice(input.assetId)
    const existing = this.repo.findPosition(account.id, input.assetId)
    let result
    try {
      result = openPosition(account.cash, account.feeRate, { assetId: input.assetId, symbol, side: input.side, quantity: input.quantity, price, now: Date.now() }, existing)
    } catch (err) {
      throw new AppError(ErrorCodes.VALIDATION, err instanceof Error ? err.message : 'Order rejected.')
    }
    this.repo.db.transaction(() => {
      this.repo.upsertPosition(account.id, result.position, existing?.id)
      this.repo.setCash(account.id, result.cash)
    })()
    log.info(`open ${input.side} ${input.quantity} ${symbol} @ ${price}`)
    return this.getSnapshot(account.id)
  }

  close(input: PaperCloseInput): PaperSnapshot {
    const position = this.repo.getPosition(input.positionId)
    const account = this.repo.getAccount(position.accountId)
    const { price } = this.currentPrice(position.assetId)
    let result
    try {
      result = closePosition(account.cash, account.feeRate, position, input.quantity, price, Date.now())
    } catch (err) {
      throw new AppError(ErrorCodes.VALIDATION, err instanceof Error ? err.message : 'Close rejected.')
    }
    this.repo.db.transaction(() => {
      if (result.remaining) this.repo.upsertPosition(account.id, result.remaining, position.id)
      else this.repo.deletePosition(position.id)
      this.repo.addTrade(account.id, result.trade)
      this.repo.setCash(account.id, result.cash)
    })()
    log.info(`close ${position.side} ${result.trade.quantity} ${position.symbol} @ ${price} pnl ${result.trade.pnl.toFixed(2)}`)
    return this.getSnapshot(account.id)
  }
}
