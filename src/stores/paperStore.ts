import { create } from 'zustand'
import type { PaperCloseInput, PaperOrderInput, PaperSnapshot } from '@shared/types'
import { api, errorMessage } from '@/lib/api'

interface PaperState {
  snapshot: PaperSnapshot | null
  loaded: boolean
  busy: boolean
  error: string | null
  load: () => Promise<void>
  open: (input: PaperOrderInput) => Promise<boolean>
  close: (input: PaperCloseInput) => Promise<boolean>
  reset: (startingBalance?: number, feeRate?: number) => Promise<void>
  clearError: () => void
}

export const usePaperStore = create<PaperState>((set, get) => {
  const run = async (fn: () => Promise<PaperSnapshot>): Promise<boolean> => {
    set({ busy: true })
    try {
      set({ snapshot: await fn(), error: null })
      return true
    } catch (err) {
      set({ error: errorMessage(err) })
      return false
    } finally {
      set({ busy: false })
    }
  }
  return {
    snapshot: null,
    loaded: false,
    busy: false,
    error: null,
    load: async () => {
      try {
        set({ snapshot: await api.paper.getSnapshot(), loaded: true, error: null })
      } catch (err) {
        set({ loaded: true, error: errorMessage(err) })
      }
    },
    open: (input) => run(() => api.paper.open(input)),
    close: (input) => run(() => api.paper.close(input)),
    reset: async (balance, fee) => {
      const id = get().snapshot?.account.id
      if (!id) return
      await run(() => api.paper.reset(id, balance, fee))
    },
    clearError: () => set({ error: null })
  }
})
