import { app } from 'electron'
import { createLogger } from '../logger'
import type { UpdateStatus } from '@shared/ipc'

const log = createLogger('update')
export type { UpdateStatus }

/**
 * Abstraction over the update channel so the distribution mechanism can
 * change without touching the UI. The MVP ships a GitHub Releases
 * implementation (electron-updater) that only activates in packaged builds;
 * it never downloads without the user asking and never installs silently.
 */
export interface UpdateService {
  check(): Promise<UpdateStatus>
  download(): Promise<UpdateStatus>
  /** Quits and installs a downloaded update. */
  install(): void
  current(): UpdateStatus
}

export class GitHubReleasesUpdateService implements UpdateService {
  private status: UpdateStatus = { state: 'unavailable', reason: 'Updates are only available in the installed application.' }
  private updater: typeof import('electron-updater').autoUpdater | null = null

  constructor() {
    if (!app.isPackaged) return
    try {
      // Lazy require keeps the dev process free of updater side effects.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { autoUpdater } = require('electron-updater') as typeof import('electron-updater')
      autoUpdater.autoDownload = false
      autoUpdater.autoInstallOnAppQuit = true
      autoUpdater.logger = null
      autoUpdater.on('update-available', (info) => (this.status = { state: 'available', version: info.version, releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined }))
      autoUpdater.on('update-not-available', (info) => (this.status = { state: 'up-to-date', version: info.version }))
      autoUpdater.on('update-downloaded', (info) => (this.status = { state: 'downloaded', version: info.version }))
      autoUpdater.on('error', (err) => {
        log.warn('updater error', err)
        this.status = { state: 'error', message: 'Could not check for updates.' }
      })
      this.updater = autoUpdater
      this.status = { state: 'up-to-date', version: app.getVersion() }
    } catch (err) {
      log.warn('updater unavailable', err)
    }
  }

  current(): UpdateStatus {
    return this.status
  }

  async check(): Promise<UpdateStatus> {
    if (!this.updater) return this.status
    this.status = { state: 'checking' }
    try {
      await this.updater.checkForUpdates()
    } catch (err) {
      log.warn('check failed', err)
      this.status = { state: 'error', message: 'Could not check for updates.' }
    }
    return this.status
  }

  async download(): Promise<UpdateStatus> {
    if (!this.updater || this.status.state !== 'available') return this.status
    try {
      await this.updater.downloadUpdate()
    } catch (err) {
      log.warn('download failed', err)
      this.status = { state: 'error', message: 'Could not download the update.' }
    }
    return this.status
  }

  install(): void {
    if (this.updater && this.status.state === 'downloaded') this.updater.quitAndInstall()
  }
}
