import { app, BrowserWindow, dialog } from 'electron'
import { join } from 'node:path'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { initLogger, createLogger, log } from './logger'
import { openDatabase } from './database/database'
import { SettingsRepository } from './database/repositories/settingsRepository'
import type { AppContext } from './context'
import { registerAppHandlers } from './ipc/appHandlers'
import { registerSettingsHandlers } from './ipc/settingsHandlers'
import { registerMarketHandlers } from './ipc/marketHandlers'
import { MarketCacheRepository } from './database/repositories/marketCacheRepository'
import { WatchlistRepository } from './database/repositories/watchlistRepository'
import { registerWatchlistHandlers } from './ipc/watchlistHandlers'
import { MarketService } from './market/marketService'
import { emit } from './ipc/registry'
import { createMainWindow } from './window'
import { installScreenshotHook } from './devtools'

initLogger()
const logger = createLogger('main')

// Single-instance lock: a second launch focuses the existing window.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })
  void bootstrap()
}

async function bootstrap(): Promise<void> {
  await app.whenReady()
  electronApp.setAppUserModelId('com.cryptointelligence.app')

  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))

  let ctx: AppContext
  try {
    ctx = buildContext()
  } catch (err) {
    logger.error('startup failed', err)
    dialog.showErrorBox(
      'Crypto Intelligence could not start',
      'The local database could not be opened. See the application log for details.'
    )
    app.exit(1)
    return
  }

  registerAppHandlers(ctx)
  registerSettingsHandlers(ctx)
  registerMarketHandlers(ctx)
  registerWatchlistHandlers(ctx)

  void ctx.services.market.start(ctx.repos.settings.get())

  installScreenshotHook(createMainWindow())
  logger.info(`Crypto Intelligence ${app.getVersion()} started (electron ${process.versions.electron})`)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
  app.on('will-quit', () => {
    ctx.services.market.stop()
    try {
      ctx.db.close()
    } catch (err) {
      logger.warn('error closing database', err)
    }
  })
}

function buildContext(): AppContext {
  const userData = app.getPath('userData')
  const logPath = log.transports.file.getFile().path
  const paths = {
    userData,
    dbPath: join(userData, 'crypto-intelligence.db'),
    logDir: join(logPath, '..'),
    logPath
  }
  const db = openDatabase(paths.dbPath)
  const repos = { settings: new SettingsRepository(db), marketCache: new MarketCacheRepository(db), watchlists: new WatchlistRepository(db) }
  const market = new MarketService(repos.marketCache, {
    onTickers: (snapshot) => emit('market:tickers', snapshot),
    onConnectivity: (status) => emit('connectivity:changed', status)
  })
  return { paths, db, repos, services: { market } }
}
