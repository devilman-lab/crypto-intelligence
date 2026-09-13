import { create } from 'zustand'
import type { AlertRule, AlertRuleInput, AlertsSnapshot, AlertTrigger } from '@shared/types'
import { api, errorMessage } from '@/lib/api'

interface AlertState {
  rules: AlertRule[]
  triggers: AlertTrigger[]
  loaded: boolean
  error: string | null
  load: () => Promise<void>
  apply: (s: AlertsSnapshot) => void
  create: (input: AlertRuleInput) => Promise<boolean>
  update: (id: number, input: AlertRuleInput) => Promise<boolean>
  setEnabled: (id: number, enabled: boolean) => Promise<void>
  remove: (id: number) => Promise<void>
  clearTriggers: () => Promise<void>
}

export const useAlertStore = create<AlertState>((set) => {
  const run = async (fn: () => Promise<AlertsSnapshot>): Promise<boolean> => {
    try {
      set({ ...(await fn()), error: null })
      return true
    } catch (err) {
      set({ error: errorMessage(err) })
      return false
    }
  }
  return {
    rules: [],
    triggers: [],
    loaded: false,
    error: null,
    load: async () => {
      try {
        set({ ...(await api.alerts.getSnapshot()), loaded: true, error: null })
      } catch (err) {
        set({ loaded: true, error: errorMessage(err) })
      }
    },
    apply: (s) => set(s),
    create: (input) => run(() => api.alerts.create(input)),
    update: (id, input) => run(() => api.alerts.update(id, input)),
    setEnabled: async (id, enabled) => {
      await run(() => api.alerts.setEnabled(id, enabled))
    },
    remove: async (id) => {
      await run(() => api.alerts.delete(id))
    },
    clearTriggers: async () => {
      await run(() => api.alerts.clearTriggers())
    }
  }
})
