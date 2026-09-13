import log from 'electron-log/main'

/**
 * Structured application logger (electron-log).
 * - Writes to the user's log directory (see AppInfo.logPath).
 * - Never log secrets, credentials or personal data through this logger.
 */
export function initLogger(): void {
  log.initialize()
  log.transports.file.level = 'info'
  log.transports.file.maxSize = 5 * 1024 * 1024
  log.transports.console.level = process.env.NODE_ENV === 'development' ? 'debug' : 'info'
  log.transports.console.format = '[{h}:{i}:{s}.{ms}] [{level}] {scope} {text}'
  log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {scope} {text}'
  log.errorHandler.startCatching({ showDialog: false })
}

export function createLogger(scope: string) {
  return log.scope(scope)
}

export type Logger = ReturnType<typeof createLogger>
export { log }
