import { app, shell } from 'electron'
import { z } from 'zod'
import { handle, noArgs } from './registry'
import type { AppContext } from '../context'
import { AppError, ErrorCodes } from '../errors'

const ALLOWED_PROTOCOLS = new Set(['https:', 'mailto:'])

export function registerAppHandlers(ctx: AppContext): void {
  handle('app:getInfo', noArgs, () => ({
    version: app.getVersion(),
    electronVersion: process.versions.electron ?? '',
    platform: process.platform,
    arch: process.arch,
    dbPath: ctx.paths.dbPath,
    logPath: ctx.paths.logPath,
    logDir: ctx.paths.logDir,
    userDataPath: ctx.paths.userData
  }))

  handle('app:openExternal', z.tuple([z.string().url().max(2048)]), async (url) => {
    const parsed = new URL(url)
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      throw new AppError(ErrorCodes.VALIDATION, 'Only https and mailto links can be opened.')
    }
    await shell.openExternal(url)
  })

  // Restricted to the app's own data/log directories.
  handle('app:openPath', z.tuple([z.string().max(1024)]), async (path) => {
    const allowed = [ctx.paths.userData, ctx.paths.logDir]
    if (!allowed.some((dir) => path.startsWith(dir))) {
      throw new AppError(ErrorCodes.VALIDATION, 'Path is outside the application data directory.')
    }
    const result = await shell.openPath(path)
    if (result) throw new AppError(ErrorCodes.INTERNAL, 'Could not open the folder.')
  })
}
