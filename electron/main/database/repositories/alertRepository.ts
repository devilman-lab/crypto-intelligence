import type { AppDatabase } from '../database'
import type { AlertRule, AlertRuleInput, AlertTrigger } from '@shared/types'
import { AppError, ErrorCodes } from '../../errors'

interface RRow { id: number; asset_id: string; symbol: string; kind: AlertRule['kind']; direction: AlertRule['direction']; threshold: number; mode: AlertRule['mode']; enabled: number; armed: number; last_triggered_at: number | null; trigger_count: number; note: string; created_at: number }
interface TRow { id: number; alert_id: number; symbol: string; kind: AlertRule['kind']; message: string; value: number; triggered_at: number }

const toRule = (r: RRow): AlertRule => ({ id: r.id, assetId: r.asset_id, symbol: r.symbol, kind: r.kind, direction: r.direction, threshold: r.threshold, mode: r.mode, enabled: !!r.enabled, armed: !!r.armed, lastTriggeredAt: r.last_triggered_at, triggerCount: r.trigger_count, note: r.note, createdAt: r.created_at })
const toTrigger = (r: TRow): AlertTrigger => ({ id: r.id, alertId: r.alert_id, symbol: r.symbol, kind: r.kind, message: r.message, value: r.value, triggeredAt: r.triggered_at })

export class AlertRepository {
  constructor(readonly db: AppDatabase) {}

  list(): AlertRule[] {
    return (this.db.prepare('SELECT * FROM alerts ORDER BY created_at DESC').all() as RRow[]).map(toRule)
  }

  get(id: number): AlertRule {
    const r = this.db.prepare('SELECT * FROM alerts WHERE id = ?').get(id) as RRow | undefined
    if (!r) throw new AppError(ErrorCodes.NOT_FOUND, 'Alert not found.')
    return toRule(r)
  }

  create(input: AlertRuleInput, symbol: string): AlertRule {
    const res = this.db
      .prepare('INSERT INTO alerts (asset_id, symbol, kind, direction, threshold, mode, enabled, armed, note, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?, ?)')
      .run(input.assetId, symbol, input.kind, input.direction, input.threshold, input.mode, input.note, Date.now())
    return this.get(Number(res.lastInsertRowid))
  }

  update(id: number, input: AlertRuleInput, symbol: string): AlertRule {
    this.get(id)
    // Editing the condition re-arms the alert from a clean state.
    this.db
      .prepare('UPDATE alerts SET asset_id = ?, symbol = ?, kind = ?, direction = ?, threshold = ?, mode = ?, note = ?, armed = 0, enabled = 1 WHERE id = ?')
      .run(input.assetId, symbol, input.kind, input.direction, input.threshold, input.mode, input.note, id)
    return this.get(id)
  }

  setEnabled(id: number, enabled: boolean): AlertRule {
    this.get(id)
    this.db.prepare('UPDATE alerts SET enabled = ?, armed = 0 WHERE id = ?').run(enabled ? 1 : 0, id)
    return this.get(id)
  }

  /** Persists evaluation state after the engine runs. */
  saveState(rule: AlertRule): void {
    this.db.prepare('UPDATE alerts SET enabled = ?, armed = ?, last_triggered_at = ?, trigger_count = ? WHERE id = ?').run(rule.enabled ? 1 : 0, rule.armed ? 1 : 0, rule.lastTriggeredAt, rule.triggerCount, rule.id)
  }

  delete(id: number): void {
    this.db.prepare('DELETE FROM alerts WHERE id = ?').run(id)
  }

  addTrigger(t: Omit<AlertTrigger, 'id'>): AlertTrigger {
    const res = this.db.prepare('INSERT INTO alert_triggers (alert_id, symbol, kind, message, value, triggered_at) VALUES (?, ?, ?, ?, ?, ?)').run(t.alertId, t.symbol, t.kind, t.message, t.value, t.triggeredAt)
    return { ...t, id: Number(res.lastInsertRowid) }
  }

  listTriggers(limit = 200): AlertTrigger[] {
    return (this.db.prepare('SELECT * FROM alert_triggers ORDER BY triggered_at DESC, id DESC LIMIT ?').all(limit) as TRow[]).map(toTrigger)
  }

  clearTriggers(): void {
    this.db.prepare('DELETE FROM alert_triggers').run()
  }
}
