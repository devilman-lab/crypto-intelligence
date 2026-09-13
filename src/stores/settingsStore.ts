import { create } from 'zustand'
import { DEFAULT_SETTINGS, type AppSettings, type ThemeMode } from '@shared/types'
import { api, errorMessage } from '@/lib/api'

interface SettingsState {
  settings: AppSettings
  loaded: boolean
  error: string | null
  load: () => Promise<void>
  update: (patch: Partial<AppSettings>) => Promise<void>
  applyRemote: (s: AppSettings) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  error: null,
  load: async () => {
    try {
      const settings = await api.settings.get()
      set({ settings, loaded: true, error: null })
      applyTheme(settings.theme)
    } catch (err) {
      set({ loaded: true, error: errorMessage(err) })
    }
  },
  update: async (patch) => {
    try {
      const settings = await api.settings.update(patch)
      set({ settings, error: null })
      applyTheme(settings.theme)
    } catch (err) {
      set({ error: errorMessage(err) })
    }
  },
  applyRemote: (settings) => {
    set({ settings })
    applyTheme(settings.theme)
  }
}))

let mediaListener: (() => void) | null = null

export function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  if (mediaListener) {
    mq.removeEventListener('change', mediaListener)
    mediaListener = null
  }
  const apply = () => {
    const dark = mode === 'dark' || (mode === 'system' && mq.matches)
    root.classList.toggle('dark', dark)
  }
  apply()
  if (mode === 'system') {
    mediaListener = apply
    mq.addEventListener('change', apply)
  }
}
