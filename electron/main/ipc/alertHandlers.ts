import { z } from 'zod'
import { handle, noArgs } from './registry'
import type { AppContext } from '../context'

const id = z.number().int().positive()
const ruleInput = z
  .object({
    assetId: z.string().min(1).max(128),
    kind: z.enum(['price', 'change24h', 'volatility', 'volume', 'rsi']),
    direction: z.enum(['above', 'below']),
    threshold: z.number().finite(),
    mode: z.enum(['once', 'repeating']),
    note: z.string().max(500)
  })
  .strict()

export function registerAlertHandlers(ctx: AppContext): void {
  const engine = ctx.services.alerts
  handle('alerts:getSnapshot', noArgs, () => engine.getSnapshot())
  handle('alerts:create', z.tuple([ruleInput]), (input) => engine.create(input))
  handle('alerts:update', z.tuple([id, ruleInput]), (i, input) => engine.update(i, input))
  handle('alerts:setEnabled', z.tuple([id, z.boolean()]), (i, enabled) => engine.setEnabled(i, enabled))
  handle('alerts:delete', z.tuple([id]), (i) => engine.delete(i))
  handle('alerts:clearTriggers', noArgs, () => engine.clearTriggers())
}
