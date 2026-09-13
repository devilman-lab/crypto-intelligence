import { z } from 'zod'
import { handle, noArgs } from './registry'
import type { AppContext } from '../context'
import { AppError, ErrorCodes } from '../errors'

const id = z.number().int().positive()
const name = z.string().trim().min(1).max(60)

export const transactionInputSchema = z
  .object({
    portfolioId: id,
    assetId: z.string().min(1).max(128),
    type: z.enum(['buy', 'sell', 'deposit', 'withdrawal']),
    quantity: z.number().finite().nonnegative().max(1e15),
    price: z.number().finite().nonnegative().max(1e12),
    fee: z.number().finite().nonnegative().max(1e12),
    timestamp: z.number().int().min(946_684_800_000).max(4_102_444_800_000), // 2000-01-01 .. 2100-01-01
    notes: z.string().max(2000)
  })
  .strict()

export function registerPortfolioHandlers(ctx: AppContext): void {
  const repo = ctx.repos.portfolios
  const symbolFor = (assetId: string): string => {
    const asset = ctx.services.market.getAsset(assetId)
    if (!asset) throw new AppError(ErrorCodes.NOT_FOUND, 'Unknown asset.')
    return asset.symbol
  }

  handle('portfolio:list', noArgs, () => repo.listPortfolios())
  handle('portfolio:create', z.tuple([name]), (n) => repo.createPortfolio(n))
  handle('portfolio:rename', z.tuple([id, name]), (i, n) => repo.renamePortfolio(i, n))
  handle('portfolio:delete', z.tuple([id]), (i) => repo.deletePortfolio(i))
  handle('portfolio:listTransactions', z.tuple([id]), (i) => repo.listTransactions(i))
  handle('portfolio:listAllTransactions', noArgs, () => repo.listAllTransactions())
  handle('portfolio:addTransaction', z.tuple([transactionInputSchema]), (input) => repo.addTransaction(input, symbolFor(input.assetId)))
  handle('portfolio:updateTransaction', z.tuple([id, transactionInputSchema]), (i, input) => repo.updateTransaction(i, input, symbolFor(input.assetId)))
  handle('portfolio:deleteTransaction', z.tuple([id]), (i) => repo.deleteTransaction(i))
}
