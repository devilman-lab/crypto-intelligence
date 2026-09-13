import { contextBridge, ipcRenderer } from 'electron'
import type { IpcArgs, IpcChannel, IpcEvent, IpcEventPayload, IpcResponse, IpcResult } from '@shared/ipc'
import { IPC_EVENTS } from '@shared/ipc'

/**
 * Preload bridge. This is the ONLY surface the renderer can reach.
 * - No Node APIs, filesystem or database handles are exposed.
 * - `invoke` is restricted to channels declared in the shared IPC contract
 *   (enforced by the type system here and by handler registration in main).
 * - `on` only subscribes to the whitelisted push events.
 */
function invoke<C extends IpcChannel>(channel: C, ...args: IpcArgs<C>): Promise<IpcResponse<IpcResult<C>>> {
  return ipcRenderer.invoke(channel, ...args)
}

function on<E extends IpcEvent>(event: E, listener: (payload: IpcEventPayload<E>) => void): () => void {
  if (!IPC_EVENTS.includes(event)) throw new Error(`Unknown event: ${event}`)
  const wrapped = (_e: Electron.IpcRendererEvent, payload: IpcEventPayload<E>) => listener(payload)
  ipcRenderer.on(event, wrapped)
  return () => ipcRenderer.removeListener(event, wrapped)
}

const api = {
  app: {
    getInfo: () => invoke('app:getInfo'),
    openExternal: (url: string) => invoke('app:openExternal', url),
    openPath: (path: string) => invoke('app:openPath', path)
  },
  settings: {
    get: () => invoke('settings:get'),
    update: (patch: IpcArgs<'settings:update'>[0]) => invoke('settings:update', patch)
  },
  market: {
    getSnapshot: () => invoke('market:getSnapshot'),
    refresh: () => invoke('market:refresh'),
    getStatus: () => invoke('market:getStatus'),
    searchAssets: (query: string, limit?: number) => invoke('market:searchAssets', query, limit),
    getOHLCV: (assetId: string, timeframe: IpcArgs<'market:getOHLCV'>[1], limit?: number) => invoke('market:getOHLCV', assetId, timeframe, limit),
    getVolume: (assetId: string) => invoke('market:getVolume', assetId)
  },
  analytics: {
    getSnapshot: () => invoke('analytics:getSnapshot'),
    refresh: () => invoke('analytics:refresh')
  },
  screen: {
    list: () => invoke('screen:list'),
    create: (name: string, definition: IpcArgs<'screen:create'>[1]) => invoke('screen:create', name, definition),
    update: (id: number, patch: IpcArgs<'screen:update'>[1]) => invoke('screen:update', id, patch),
    delete: (id: number) => invoke('screen:delete', id)
  },
  portfolio: {
    list: () => invoke('portfolio:list'),
    create: (name: string) => invoke('portfolio:create', name),
    rename: (id: number, name: string) => invoke('portfolio:rename', id, name),
    delete: (id: number) => invoke('portfolio:delete', id),
    listTransactions: (portfolioId: number) => invoke('portfolio:listTransactions', portfolioId),
    listAllTransactions: () => invoke('portfolio:listAllTransactions'),
    addTransaction: (input: IpcArgs<'portfolio:addTransaction'>[0]) => invoke('portfolio:addTransaction', input),
    updateTransaction: (id: number, input: IpcArgs<'portfolio:updateTransaction'>[1]) => invoke('portfolio:updateTransaction', id, input),
    deleteTransaction: (id: number) => invoke('portfolio:deleteTransaction', id)
  },
  paper: {
    getSnapshot: () => invoke('paper:getSnapshot'),
    reset: (accountId: number, startingBalance?: number, feeRate?: number) => invoke('paper:reset', accountId, startingBalance, feeRate),
    open: (input: IpcArgs<'paper:open'>[0]) => invoke('paper:open', input),
    close: (input: IpcArgs<'paper:close'>[0]) => invoke('paper:close', input)
  },
  journal: {
    list: () => invoke('journal:list'),
    create: (input: IpcArgs<'journal:create'>[0]) => invoke('journal:create', input),
    update: (id: number, input: IpcArgs<'journal:update'>[1]) => invoke('journal:update', id, input),
    delete: (id: number) => invoke('journal:delete', id),
    strategies: () => invoke('journal:strategies')
  },
  watchlist: {
    list: () => invoke('watchlist:list'),
    create: (name: string) => invoke('watchlist:create', name),
    rename: (id: number, name: string) => invoke('watchlist:rename', id, name),
    delete: (id: number) => invoke('watchlist:delete', id),
    addItem: (id: number, assetId: string) => invoke('watchlist:addItem', id, assetId),
    removeItem: (id: number, assetId: string) => invoke('watchlist:removeItem', id, assetId),
    reorder: (id: number, orderedAssetIds: string[]) => invoke('watchlist:reorder', id, orderedAssetIds)
  },
  events: { on }
}

export type PreloadApi = typeof api

contextBridge.exposeInMainWorld('api', api)
