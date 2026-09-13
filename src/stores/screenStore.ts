import { create } from 'zustand'
import type { SavedScreen } from '@shared/types'
import type { ScreenDefinition } from '@shared/analysis/screener'
import { api, errorMessage } from '@/lib/api'

interface ScreenState {
  saved: SavedScreen[]
  loaded: boolean
  error: string | null
  load: () => Promise<void>
  create: (name: string, definition: ScreenDefinition) => Promise<SavedScreen | null>
  update: (id: number, patch: { name?: string; definition?: ScreenDefinition }) => Promise<void>
  remove: (id: number) => Promise<void>
}

export const useScreenStore = create<ScreenState>((set) => ({
  saved: [],
  loaded: false,
  error: null,
  load: async () => {
    try {
      set({ saved: await api.screen.list(), loaded: true, error: null })
    } catch (err) {
      set({ loaded: true, error: errorMessage(err) })
    }
  },
  create: async (name, definition) => {
    try {
      const s = await api.screen.create(name, definition)
      set((st) => ({ saved: [...st.saved, s].sort((a, b) => a.name.localeCompare(b.name)), error: null }))
      return s
    } catch (err) {
      set({ error: errorMessage(err) })
      return null
    }
  },
  update: async (id, patch) => {
    try {
      const s = await api.screen.update(id, patch)
      set((st) => ({ saved: st.saved.map((x) => (x.id === id ? s : x)), error: null }))
    } catch (err) {
      set({ error: errorMessage(err) })
    }
  },
  remove: async (id) => {
    try {
      await api.screen.delete(id)
      set((st) => ({ saved: st.saved.filter((x) => x.id !== id), error: null }))
    } catch (err) {
      set({ error: errorMessage(err) })
    }
  }
}))
