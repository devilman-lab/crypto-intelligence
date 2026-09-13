import { z } from 'zod'
import { emit, handle, noArgs } from './registry'
import type { AppContext } from '../context'

export function registerBackupHandlers(ctx: AppContext): void {
  const svc = ctx.services.backup
  handle('backup:exportJson', noArgs, () => svc.exportJson())
  handle('backup:exportCsv', z.tuple([z.enum(['transactions', 'journal', 'paperTrades', 'holdings'])]), (dataset) => svc.exportCsv(dataset))
  handle('backup:pickImport', noArgs, () => svc.pickImport())
  handle('backup:applyImport', z.tuple([z.enum(['merge', 'replace'])]), (mode) => {
    const summary = svc.applyImport(mode)
    emit('data:restored', null)
    ctx.services.alerts.evaluateAll()
    return summary
  })
  handle('backup:cancelImport', noArgs, () => svc.cancelImport())
}
