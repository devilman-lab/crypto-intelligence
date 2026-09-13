import { z } from 'zod'
import { handle, noArgs } from './registry'
import type { AppContext } from '../context'

const id = z.number().int().positive()

export function registerPaperHandlers(ctx: AppContext): void {
  const svc = ctx.services.paper
  handle('paper:getSnapshot', noArgs, () => svc.getSnapshot(svc.ensureDefaultAccount().id))
  handle('paper:reset', z.tuple([id, z.number().finite().min(100).max(1e9).optional(), z.number().finite().min(0).max(0.05).optional()]), (i, balance, fee) => svc.reset(i, balance, fee))
  handle(
    'paper:open',
    z.tuple([z.object({ accountId: id, assetId: z.string().min(1).max(128), side: z.enum(['long', 'short']), quantity: z.number().finite().positive().max(1e12) }).strict()]),
    (input) => svc.open(input)
  )
  handle('paper:close', z.tuple([z.object({ positionId: id, quantity: z.number().finite().positive().max(1e12).optional() }).strict()]), (input) => svc.close(input))
}
