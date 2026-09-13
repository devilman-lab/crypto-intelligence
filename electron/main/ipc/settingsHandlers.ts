import { z } from 'zod'
import { emit, handle, noArgs } from './registry'
import type { AppContext } from '../context'

const settingsPatchSchema = z
  .object({
    theme: z.enum(['dark', 'light', 'system']),
    marketDataProvider: z.enum(['coingecko', 'binance']),
    refreshIntervalSec: z.number().int().min(15).max(3600),
    currency: z.enum(['USD', 'EUR', 'GBP', 'JPY']),
    notificationsEnabled: z.boolean(),
    aiModuleEnabled: z.boolean()
  })
  .partial()
  .strict()

export function registerSettingsHandlers(ctx: AppContext): void {
  handle('settings:get', noArgs, () => ctx.repos.settings.get())

  handle('settings:update', z.tuple([settingsPatchSchema]), (patch) => {
    const next = ctx.repos.settings.update(patch)
    emit('settings:changed', next)
    return next
  })
}
