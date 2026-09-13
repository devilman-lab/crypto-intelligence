import { create } from 'zustand'
import type { Watchlist } from '@shared/types'
import { api, errorMessage } from '@/lib/api'

interface WatchlistState {
  lists: Watchlist[]
  activeId: number | null
  loaded: boolean
  error: string | null
  load: () => Promise<void>
  setActive: (id: number) => void
  create: (name: string) => Promise<Watchlist | null>
  rename: (id: number, name: string) => Promise<void>
  remove: (id: number) => Promise<void>
  addItem: (id: number, assetId: string) => Promise<void>
  removeItem: (id: number, assetId: string) => Promise<void>
  reorder: (id: number, orderedAssetIds: string[]) => Promise<void>
  /** Add to the active list, or remove if present. */
  toggle: (assetId: string) => Promise<void>
  /** Whether the asset is in ANY watchlist. */
  contains: (assetId: string) => boolean
}

const DEFAULT_NAME = 'My Coins'

export const useWatchlistStore = create<WatchlistState>((set, get) => {
  const replace = (w: Watchlist) => set((s) => ({ lists: s.lists.map((l) => (l.id === w.id ? w : l)) }))
  const run = async (fn: () => Promise<void>) => {
    try {
      await fn()
      set({ error: null })
    } catch (err) {
      set({ error: errorMessage(err) })
    }
  }
  return {
    lists: [],
    activeId: null,
    loaded: false,
    error: null,
    load: async () => {
      try {
        let lists = await api.watchlist.list()
        if (lists.length === 0) lists = [await api.watchlist.create(DEFAULT_NAME)]
        set((s) => ({ lists, loaded: true, activeId: s.activeId && lists.some((l) => l.id === s.activeId) ? s.activeId : (lists[0]?.id ?? null) }))
      } catch (err) {
        set({ loaded: true, error: errorMessage(err) })
      }
    },
    setActive: (id) => set({ activeId: id }),
    create: async (name) => {
      try {
        const w = await api.watchlist.create(name)
        set((s) => ({ lists: [...s.lists, w], activeId: w.id, error: null }))
        return w
      } catch (err) {
        set({ error: errorMessage(err) })
        return null
      }
    },
    rename: (id, name) => run(async () => replace(await api.watchlist.rename(id, name))),
    remove: (id) =>
      run(async () => {
        await api.watchlist.delete(id)
        set((s) => {
          const lists = s.lists.filter((l) => l.id !== id)
          return { lists, activeId: s.activeId === id ? (lists[0]?.id ?? null) : s.activeId }
        })
      }),
    addItem: (id, assetId) => run(async () => replace(await api.watchlist.addItem(id, assetId))),
    removeItem: (id, assetId) => run(async () => replace(await api.watchlist.removeItem(id, assetId))),
    reorder: (id, order) => run(async () => replace(await api.watchlist.reorder(id, order))),
    toggle: async (assetId) => {
      const { activeId, lists, addItem, removeItem } = get()
      const target = lists.find((l) => l.items.some((i) => i.assetId === assetId)) ?? lists.find((l) => l.id === activeId) ?? lists[0]
      if (!target) return
      if (target.items.some((i) => i.assetId === assetId)) await removeItem(target.id, assetId)
      else await addItem(target.id, assetId)
    },
    contains: (assetId) => get().lists.some((l) => l.items.some((i) => i.assetId === assetId))
  }
})
