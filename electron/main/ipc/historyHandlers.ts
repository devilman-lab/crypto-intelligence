import { z } from 'zod'
import { handle } from './registry'
import type { AppContext } from '../context'
import { analyseHistory } from '@shared/analysis/history'
import { AppError, ErrorCodes } from '../errors'

const condition = z
  .object({
    metric: z.enum(['vol7d', 'vol30d', 'rsi14', 'change1d', 'volumeRatio', 'drawdownFromHigh30d']),
    direction: z.enum(['above', 'below']),
    threshold: z.number().finite()
  })
  .strict()

export function registerHistoryHandlers(ctx: AppContext): void {
  handle('history:analyse', z.tuple([z.string().min(1).max(128), condition, z.number().int().min(1).max(90)]), async (assetId, cond, horizon) => {
    // Up to 1000 daily candles (~2.7 years) — the most a single Binance request returns.
    const { candles, source, stale } = await ctx.services.market.getOHLCV(assetId, '1d', 1000)
    if (candles.length < 60) throw new AppError(ErrorCodes.PROVIDER, 'Not enough daily history for this asset (need at least 60 candles).')
    return { result: analyseHistory(candles, cond, horizon), source, stale, from: candles[0]!.time, to: candles[candles.length - 1]!.time }
  })
}
