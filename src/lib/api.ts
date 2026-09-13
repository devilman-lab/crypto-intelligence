import type { IpcResponse } from '@shared/ipc'
import type { Timeframe, TransactionInput, PaperOrderInput, PaperCloseInput, JournalEntryInput, AlertRuleInput } from '@shared/types'
import type { ScreenDefinition } from '@shared/analysis/screener'
import type { HistoryCondition } from '@shared/analysis/history'

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
  analytics: {
    getSnapshot: () => unwrap(window.api.analytics.getSnapshot()),
    refresh: () => unwrap(window.api.analytics.refresh())
  },
  screen: {
    list: () => unwrap(window.api.screen.list()),
    create: (name: string, definition: ScreenDefinition) => unwrap(window.api.screen.create(name, definition)),
    update: (id: number, patch: { name?: string; definition?: ScreenDefinition }) => unwrap(window.api.screen.update(id, patch)),
    delete: (id: number) => unwrap(window.api.screen.delete(id))
  },
  portfolio: {
    list: () => unwrap(window.api.portfolio.list()),
    create: (name: string) => unwrap(window.api.portfolio.create(name)),
    rename: (id: number, name: string) => unwrap(window.api.portfolio.rename(id, name)),
    delete: (id: number) => unwrap(window.api.portfolio.delete(id)),
    listTransactions: (portfolioId: number) => unwrap(window.api.portfolio.listTransactions(portfolioId)),
    listAllTransactions: () => unwrap(window.api.portfolio.listAllTransactions()),
    addTransaction: (input: TransactionInput) => unwrap(window.api.portfolio.addTransaction(input)),
    updateTransaction: (id: number, input: TransactionInput) => unwrap(window.api.portfolio.updateTransaction(id, input)),
    deleteTransaction: (id: number) => unwrap(window.api.portfolio.deleteTransaction(id))
  },
  paper: {
    getSnapshot: () => unwrap(window.api.paper.getSnapshot()),
    reset: (accountId: number, startingBalance?: number, feeRate?: number) => unwrap(window.api.paper.reset(accountId, startingBalance, feeRate)),
    open: (input: PaperOrderInput) => unwrap(window.api.paper.open(input)),
    close: (input: PaperCloseInput) => unwrap(window.api.paper.close(input))
  },
  journal: {
    list: () => unwrap(window.api.journal.list()),
    create: (input: JournalEntryInput) => unwrap(window.api.journal.create(input)),
    update: (id: number, input: JournalEntryInput) => unwrap(window.api.journal.update(id, input)),
    delete: (id: number) => unwrap(window.api.journal.delete(id)),
    strategies: () => unwrap(window.api.journal.strategies())
  },
  alerts: {
    getSnapshot: () => unwrap(window.api.alerts.getSnapshot()),
    create: (input: AlertRuleInput) => unwrap(window.api.alerts.create(input)),
    update: (id: number, input: AlertRuleInput) => unwrap(window.api.alerts.update(id, input)),
    setEnabled: (id: number, enabled: boolean) => unwrap(window.api.alerts.setEnabled(id, enabled)),
    delete: (id: number) => unwrap(window.api.alerts.delete(id)),
    clearTriggers: () => unwrap(window.api.alerts.clearTriggers())
  },
  history: {
    analyse: (assetId: string, condition: HistoryCondition, horizon: number) => unwrap(window.api.history.analyse(assetId, condition, horizon))
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
