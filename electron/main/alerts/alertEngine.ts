import { Notification } from 'electron'
import type { AlertRule, AlertRuleInput, AlertsSnapshot } from '@shared/types'
import { evaluateRule } from '@shared/analysis/alerts'
import type { AlertRepository } from '../database/repositories/alertRepository'
import type { SettingsRepository } from '../database/repositories/settingsRepository'
import type { MarketService } from '../market/marketService'
import type { AnalyticsService } from '../market/analyticsService'
import { AppError, ErrorCodes } from '../errors'
import { createLogger } from '../logger'

const log = createLogger('alerts')

/**
 * Local alert engine. Runs in the main process after every market/metrics
 * refresh, evaluates rules with the pure evaluator, persists state, records
 * triggers and raises desktop notifications (if enabled in settings).
 * Nothing leaves the machine.
 */
export class AlertEngine {
  private evaluating = false

  constructor(
    private readonly repo: AlertRepository,
    private readonly settings: SettingsRepository,
    private readonly market: MarketService,
    private readonly analytics: AnalyticsService,
    private readonly onChanged: (snapshot: AlertsSnapshot) => void
  ) {}

  getSnapshot(): AlertsSnapshot {
    return { rules: this.repo.list(), triggers: this.repo.listTriggers() }
  }

  create(input: AlertRuleInput): AlertsSnapshot {
    const rule = this.repo.create(input, this.symbolFor(input.assetId))
    // Evaluate immediately so a rule whose condition is already true arms itself instead of firing at once.
    this.primeRule(rule)
    return this.getSnapshot()
  }

  update(id: number, input: AlertRuleInput): AlertsSnapshot {
    const rule = this.repo.update(id, input, this.symbolFor(input.assetId))
    this.primeRule(rule)
    return this.getSnapshot()
  }

  setEnabled(id: number, enabled: boolean): AlertsSnapshot {
    const rule = this.repo.setEnabled(id, enabled)
    if (enabled) this.primeRule(rule)
    return this.getSnapshot()
  }

  delete(id: number): AlertsSnapshot {
    this.repo.delete(id)
    return this.getSnapshot()
  }

  clearTriggers(): AlertsSnapshot {
    this.repo.clearTriggers()
    return this.getSnapshot()
  }

  /**
   * A freshly created/enabled rule whose condition is already met is armed
   * silently — the user wants to know about the *crossing*, not the state.
   */
  private primeRule(rule: AlertRule): void {
    const t = this.market.getSnapshot().tickers.find((x) => x.assetId === rule.assetId)
    const m = this.analytics.getMetrics(rule.assetId)
    const outcome = evaluateRule({ ...rule, armed: false }, t, m, Date.now())
    if (outcome.fired) this.repo.saveState({ ...rule, armed: true })
  }

  /** Evaluates every enabled rule against the latest data. Safe to call often. */
  evaluateAll(): void {
    if (this.evaluating) return
    this.evaluating = true
    try {
      const rules = this.repo.list().filter((r) => r.enabled)
      if (rules.length === 0) return
      const tickers = new Map(this.market.getSnapshot().tickers.map((t) => [t.assetId, t]))
      const now = Date.now()
      let changed = false
      const notify = this.settings.get().notificationsEnabled
      for (const rule of rules) {
        const outcome = evaluateRule(rule, tickers.get(rule.assetId), this.analytics.getMetrics(rule.assetId), now)
        if (!outcome.changed) continue
        changed = true
        this.repo.saveState(outcome.rule)
        if (outcome.fired) {
          this.repo.addTrigger({ alertId: rule.id, symbol: rule.symbol, kind: rule.kind, message: outcome.fired.message, value: outcome.fired.value, triggeredAt: now })
          log.info(`alert fired: ${outcome.fired.message}`)
          if (notify) this.notify(outcome.fired.message, rule.note)
        }
      }
      if (changed) this.onChanged(this.getSnapshot())
    } catch (err) {
      log.error('alert evaluation failed', err)
    } finally {
      this.evaluating = false
    }
  }

  private notify(title: string, body: string): void {
    try {
      if (!Notification.isSupported()) return
      new Notification({ title: `Crypto Intelligence · ${title}`, body: body || 'Alert condition met.', silent: false }).show()
    } catch (err) {
      log.warn('notification failed', err)
    }
  }

  private symbolFor(assetId: string): string {
    const asset = this.market.getAsset(assetId)
    if (!asset) throw new AppError(ErrorCodes.NOT_FOUND, 'Unknown asset.')
    return asset.symbol
  }
}
