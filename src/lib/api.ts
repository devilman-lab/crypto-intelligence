import type { IpcResponse } from '@shared/ipc'
import type { Timeframe } from '@shared/types'

/** Error thrown by the typed API client when the main process reports a failure. */
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** Unwraps an IPC response envelope, throwing ApiError on failure. */
export async function unwrap<T>(p: Promise<IpcResponse<T>>): Promise<T> {
  const res = await p
  if (res.ok) return res.data
  throw new ApiError(res.error.code, res.error.message)
}

/**
 * Typed renderer-side API. Thin wrapper over window.api that unwraps
 * envelopes so callers get plain values or a thrown ApiError.
 */
export const api = {
  app: {
    getInfo: () => unwrap(window.api.app.getInfo()),
    openExternal: (url: string) => unwrap(window.api.app.openExternal(url)),
    openPath: (path: string) => unwrap(window.api.app.openPath(path))
  },
  settings: {
    get: () => unwrap(window.api.settings.get()),
    update: (patch: Parameters<typeof window.api.settings.update>[0]) =>
      unwrap(window.api.settings.update(patch))
  },
  market: {
    getSnapshot: () => unwrap(window.api.market.getSnapshot()),
    refresh: () => unwrap(window.api.market.refresh()),
    getStatus: () => unwrap(window.api.market.getStatus()),
    searchAssets: (query: string, limit?: number) => unwrap(window.api.market.searchAssets(query, limit)),
    getOHLCV: (assetId: string, timeframe: Timeframe, limit?: number) => unwrap(window.api.market.getOHLCV(assetId, timeframe, limit)),
    getVolume: (assetId: string) => unwrap(window.api.market.getVolume(assetId))
  },
  watchlist: {
    list: () => unwrap(window.api.watchlist.list()),
    create: (name: string) => unwrap(window.api.watchlist.create(name)),
    rename: (id: number, name: string) => unwrap(window.api.watchlist.rename(id, name)),
    delete: (id: number) => unwrap(window.api.watchlist.delete(id)),
    addItem: (id: number, assetId: string) => unwrap(window.api.watchlist.addItem(id, assetId)),
    removeItem: (id: number, assetId: string) => unwrap(window.api.watchlist.removeItem(id, assetId)),
    reorder: (id: number, orderedAssetIds: string[]) => unwrap(window.api.watchlist.reorder(id, orderedAssetIds))
  },
  events: window.api.events
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error) return err.message
  return 'Unexpected error.'
}
