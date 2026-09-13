import { z } from 'zod'
import { handle, noArgs } from './registry'
import type { AppContext } from '../context'
import { AppError, ErrorCodes } from '../errors'

const id = z.number().int().positive()
const name = z.string().trim().min(1).max(60)
const assetId = z.string().min(1).max(128)

export function registerWatchlistHandlers(ctx: AppContext): void {
  const repo = ctx.repos.watchlists

  handle('watchlist:list', noArgs, () => repo.list())
  handle('watchlist:create', z.tuple([name]), (n) => repo.create(n))
  handle('watchlist:rename', z.tuple([id, name]), (i, n) => repo.rename(i, n))
  handle('watchlist:delete', z.tuple([id]), (i) => repo.delete(i))
  handle('watchlist:addItem', z.tuple([id, assetId]), (i, a) => {
    const asset = ctx.services.market.getAsset(a)
    if (!asset) throw new AppError(ErrorCodes.NOT_FOUND, 'Unknown asset.')
    return repo.addItem(i, asset.id, asset.symbol)
  })
  handle('watchlist:removeItem', z.tuple([id, assetId]), (i, a) => repo.removeItem(i, a))
  handle('watchlist:reorder', z.tuple([id, z.array(assetId).max(500)]), (i, order) => repo.reorder(i, order))
}
