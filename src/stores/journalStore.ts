import { create } from 'zustand'
import type { JournalEntry, JournalEntryInput } from '@shared/types'
import { api, errorMessage } from '@/lib/api'

interface JournalState {
  entries: JournalEntry[]
  loaded: boolean
  error: string | null
  load: () => Promise<void>
  create: (input: JournalEntryInput) => Promise<boolean>
  update: (id: number, input: JournalEntryInput) => Promise<boolean>
  remove: (id: number) => Promise<void>
}

const sortEntries = (list: JournalEntry[]) => [...list].sort((a, b) => b.openedAt - a.openedAt || b.id - a.id)

export const useJournalStore = create<JournalState>((set) => {
  const guard = async (fn: () => Promise<void>): Promise<boolean> => {
    try {
      await fn()
      set({ error: null })
      return true
    } catch (err) {
      set({ error: errorMessage(err) })
      return false
    }
  }
  return {
    entries: [],
    loaded: false,
    error: null,
    load: async () => {
      try {
        set({ entries: await api.journal.list(), loaded: true, error: null })
      } catch (err) {
        set({ loaded: true, error: errorMessage(err) })
      }
    },
    create: (input) =>
      guard(async () => {
        const e = await api.journal.create(input)
        set((s) => ({ entries: sortEntries([...s.entries, e]) }))
      }),
    update: (id, input) =>
      guard(async () => {
        const e = await api.journal.update(id, input)
        set((s) => ({ entries: sortEntries(s.entries.map((x) => (x.id === id ? e : x))) }))
      }),
    remove: async (id) => {
      await guard(async () => {
        await api.journal.delete(id)
        set((s) => ({ entries: s.entries.filter((x) => x.id !== id) }))
      })
    }
  }
})
