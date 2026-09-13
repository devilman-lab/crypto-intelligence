import { app, type BrowserWindow } from 'electron'
import { writeFile } from 'node:fs/promises'
import { createLogger } from './logger'

const log = createLogger('devtools')

/**
 * Development helper: when CI_SCREENSHOT=<file.png> is set, capture the window
 * shortly after it finishes loading, write the PNG and quit. Optionally
 * CI_SCREENSHOT_ROUTE=<page> navigates first and CI_SCREENSHOT_JS=<expr> runs a
 * snippet in the page (e.g. clicking a tab) before capture. Never active in normal use.
 */
export function installScreenshotHook(win: BrowserWindow): void {
  const target = process.env['CI_SCREENSHOT']
  if (!target) return
  const delay = Number(process.env['CI_SCREENSHOT_DELAY'] ?? 2500)
  win.webContents.on('console-message', (event) => {
    if (event.level === 'error' || event.level === 'warning') log.warn(`renderer console [${event.level}]: ${event.message}`)
  })
  win.webContents.once('did-finish-load', () => {
    setTimeout(async () => {
      try {
        const route = process.env['CI_SCREENSHOT_ROUTE']
        if (route) {
          await win.webContents.executeJavaScript(`window.__navigate && window.__navigate(${JSON.stringify(route)})`)
          await new Promise((r) => setTimeout(r, Number(process.env['CI_SCREENSHOT_ROUTE_DELAY'] ?? 3000)))
        }
        const js = process.env['CI_SCREENSHOT_JS']
        if (js) {
          await win.webContents.executeJavaScript(js)
          await new Promise((r) => setTimeout(r, 800))
        }
        const image = await win.webContents.capturePage()
        await writeFile(target, image.toPNG())
        log.info(`screenshot written to ${target}`)
      } catch (err) {
        log.error('screenshot failed', err)
      } finally {
        app.exit(0)
      }
    }, delay)
  })
}
