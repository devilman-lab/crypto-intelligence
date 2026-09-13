import { z } from 'zod'
import { handle, noArgs } from './registry'
import type { AppContext } from '../context'
import { AppError, ErrorCodes } from '../errors'
import { JOURNAL_EMOTIONS } from '@shared/types'

const id = z.number().int().positive()
const ts = z.number().int().min(946_684_800_000).max(4_102_444_800_000)

export const journalInputSchema = z
  .object({
    assetId: z.string().min(1).max(128),
    side: z.enum(['long', 'short']),
    entryPrice: z.number().finite().nonnegative().max(1e12),
    exitPrice: z.number().finite().nonnegative().max(1e12).nullable(),
    quantity: z.number().finite().positive().max(1e15),
    fees: z.number().finite().nonnegative().max(1e12),
    strategy: z.string().max(80),
    entryReason: z.string().max(4000),
    exitReason: z.string().max(4000),
    result: z.enum(['win', 'loss', 'breakeven', 'open']).optional(),
    emotion: z.enum(JOURNAL_EMOTIONS as [string, ...string[]]).transform((v) => v as (typeof JOURNAL_EMOTIONS)[number]),
    notes: z.string().max(10_000),
    screenshotPath: z.string().max(1024),
    tags: z.array(z.string().trim().min(1).max(40)).max(20),
    openedAt: ts,
    closedAt: ts.nullable()
  })
  .strict()

export function registerJournalHandlers(ctx: AppContext): void {
  const repo = ctx.repos.journal
  const symbolFor = (assetId: string): string => {
    const asset = ctx.services.market.getAsset(assetId)
    if (!asset) throw new AppError(ErrorCodes.NOT_FOUND, 'Unknown asset.')
    return asset.symbol
  }
  handle('journal:list', noArgs, () => repo.list())
  handle('journal:create', z.tuple([journalInputSchema]), (input) => repo.create(input, symbolFor(input.assetId)))
  handle('journal:update', z.tuple([id, journalInputSchema]), (i, input) => repo.update(i, input, symbolFor(input.assetId)))
  handle('journal:delete', z.tuple([id]), (i) => repo.delete(i))
  handle('journal:strategies', noArgs, () => repo.strategies())
}
