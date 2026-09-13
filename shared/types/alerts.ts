export type AlertKind = 'price' | 'change24h' | 'volatility' | 'volume' | 'rsi'
export type AlertDirection = 'above' | 'below'

export interface AlertRule {
  id: number
  assetId: string
  symbol: string
  kind: AlertKind
  direction: AlertDirection
  /** Threshold in the kind's natural unit: USD for price, percent for change/volatility/volume-vs-average, points for RSI. */
  threshold: number
  /** 'once' disables itself after firing; 'repeating' re-arms once the condition has cleared. */
  mode: 'once' | 'repeating'
  enabled: boolean
  /** Whether the condition was true at the last evaluation (used for edge triggering). */
  armed: boolean
  lastTriggeredAt: number | null
  triggerCount: number
  note: string
  createdAt: number
}

export type AlertRuleInput = Pick<AlertRule, 'assetId' | 'kind' | 'direction' | 'threshold' | 'mode' | 'note'>

export interface AlertTrigger {
  id: number
  alertId: number
  symbol: string
  kind: AlertKind
  message: string
  /** Observed value at trigger time. */
  value: number
  triggeredAt: number
}

export interface AlertsSnapshot {
  rules: AlertRule[]
  triggers: AlertTrigger[]
}
