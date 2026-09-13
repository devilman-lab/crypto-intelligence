import { z } from 'zod'
import { handle, noArgs } from './registry'
import type { AppContext } from '../context'
import { FIELD_META, type ScreenDefinition } from '@shared/analysis/screener'

const fields = Object.keys(FIELD_META) as [string, ...string[]]

/** Runtime schema for a screen definition; also reused by alert handlers. */
export const screenDefinitionSchema = z
  .object({
    logic: z.enum(['and', 'or']),
    conditions: z
      .array(
        z
          .object({
            id: z.string().max(40),
            field: z.enum(fields),
            op: z.enum(['gt', 'lt', 'gte', 'lte', 'between']),
            value: z.number().finite(),
            value2: z.number().finite().optional()
          })
          .strict()
      )
      .max(20)
  })
  .strict()
  .transform((v) => v as ScreenDefinition)

const id = z.number().int().positive()
const name = z.string().trim().min(1).max(60)

export function registerScreenHandlers(ctx: AppContext): void {
  const repo = ctx.repos.screens
  handle('screen:list', noArgs, () => repo.list())
  handle('screen:create', z.tuple([name, screenDefinitionSchema]), (n, d) => repo.create(n, d))
  handle('screen:update', z.tuple([id, z.object({ name: name.optional(), definition: screenDefinitionSchema.optional() }).strict()]), (i, patch) => repo.update(i, patch))
  handle('screen:delete', z.tuple([id]), (i) => repo.delete(i))
}
