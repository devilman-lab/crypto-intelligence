import { z } from 'zod'
import { TIMEFRAMES } from '@shared/types'
import { handle, noArgs } from './registry'
import type { AppContext } from '../context'

const timeframeSchema = z.enum(TIMEFRAMES as [string, ...string[]]).transform((v) => v as (typeof TIMEFRAMES)[number])

export function registerMarketHandlers(ctx: AppContext): void {
  const market = ctx.services.market

  handle('market:getSnapshot', noArgs, () => market.getSnapshot())
  handle('market:refresh', noArgs, () => market.refreshTickers())
  handle('market:getStatus', noArgs, () => market.getStatus())

  handle('market:searchAssets', z.tuple([z.string().max(64), z.number().int().min(1).max(500).optional()]), (query, limit) =>
    market.searchAssets(query, limit)
  )

  handle(
    'market:getOHLCV',
    z.tuple([z.string().min(1).max(128), timeframeSchema, z.number().int().min(10).max(1000).optional()]),
    (assetId, timeframe, limit) => market.getOHLCV(assetId, timeframe, limit)
  )

  handle('market:getVolume', z.tuple([z.string().min(1).max(128)]), (assetId) => market.getVolume(assetId))

  handle('analytics:getSnapshot', noArgs, () => ctx.services.analytics.getSnapshot())
  handle('analytics:refresh', noArgs, () => {
    void ctx.services.analytics.runCycle()
  })
}
