/**
 * Typed IPC contract shared by the main process, preload bridge and renderer.
 *
 * Every channel is declared here with its argument tuple and result type.
 * The main process registers a handler for each channel with runtime (zod)
 * validation of the arguments; the preload bridge only exposes the channels
 * listed here; the renderer calls them through a typed client.
 */
import type { AnalyticsSnapshot, AppInfo, AppSettings, ConnectivityStatus, CryptoAsset, OHLCVResult, TickerSnapshot, Timeframe, VolumeData, Watchlist, SavedScreen, Portfolio, Transaction, TransactionInput, PaperSnapshot, PaperOrderInput, PaperCloseInput, JournalEntry, JournalEntryInput, AlertsSnapshot, AlertRuleInput, BackupSummary, CsvDataset, ImportMode } from './types'
import type { ScreenDefinition } from './analysis/screener'
import type { HistoryCondition, HistoryResult } from './analysis/history'

export interface IpcInvokeContract {
  'app:getInfo': { args: []; result: AppInfo }
  'app:openExternal': { args: [url: string]; result: void }
  'app:openPath': { args: [path: string]; result: void }
  'settings:get': { args: []; result: AppSettings }
  'settings:update': { args: [patch: Partial<AppSettings>]; result: AppSettings }
  'market:getSnapshot': { args: []; result: TickerSnapshot }
  'market:refresh': { args: []; result: TickerSnapshot }
  'market:getStatus': { args: []; result: ConnectivityStatus }
  'market:searchAssets': { args: [query: string, limit?: number]; result: CryptoAsset[] }
  'market:getOHLCV': { args: [assetId: string, timeframe: Timeframe, limit?: number]; result: OHLCVResult }
  'market:getVolume': { args: [assetId: string]; result: VolumeData }
  'analytics:getSnapshot': { args: []; result: AnalyticsSnapshot }
  'analytics:refresh': { args: []; result: void }
  'screen:list': { args: []; result: SavedScreen[] }
  'screen:create': { args: [name: string, definition: ScreenDefinition]; result: SavedScreen }
  'screen:update': { args: [id: number, patch: { name?: string; definition?: ScreenDefinition }]; result: SavedScreen }
  'screen:delete': { args: [id: number]; result: void }
  'portfolio:list': { args: []; result: Portfolio[] }
  'portfolio:create': { args: [name: string]; result: Portfolio }
  'portfolio:rename': { args: [id: number, name: string]; result: Portfolio }
  'portfolio:delete': { args: [id: number]; result: void }
  'portfolio:listTransactions': { args: [portfolioId: number]; result: Transaction[] }
  'portfolio:listAllTransactions': { args: []; result: Transaction[] }
  'portfolio:addTransaction': { args: [input: TransactionInput]; result: Transaction }
  'portfolio:updateTransaction': { args: [id: number, input: TransactionInput]; result: Transaction }
  'portfolio:deleteTransaction': { args: [id: number]; result: void }
  'paper:getSnapshot': { args: []; result: PaperSnapshot }
  'paper:reset': { args: [accountId: number, startingBalance?: number, feeRate?: number]; result: PaperSnapshot }
  'paper:open': { args: [input: PaperOrderInput]; result: PaperSnapshot }
  'paper:close': { args: [input: PaperCloseInput]; result: PaperSnapshot }
  'journal:list': { args: []; result: JournalEntry[] }
  'journal:create': { args: [input: JournalEntryInput]; result: JournalEntry }
  'journal:update': { args: [id: number, input: JournalEntryInput]; result: JournalEntry }
  'journal:delete': { args: [id: number]; result: void }
  'journal:strategies': { args: []; result: string[] }
  'alerts:getSnapshot': { args: []; result: AlertsSnapshot }
  'alerts:create': { args: [input: AlertRuleInput]; result: AlertsSnapshot }
  'alerts:update': { args: [id: number, input: AlertRuleInput]; result: AlertsSnapshot }
  'alerts:setEnabled': { args: [id: number, enabled: boolean]; result: AlertsSnapshot }
  'alerts:delete': { args: [id: number]; result: AlertsSnapshot }
  'alerts:clearTriggers': { args: []; result: AlertsSnapshot }
  'history:analyse': { args: [assetId: string, condition: HistoryCondition, horizon: number]; result: { result: HistoryResult; source: string; stale: boolean; from: number; to: number } }
  'backup:exportJson': { args: []; result: string | null }
  'backup:exportCsv': { args: [dataset: CsvDataset]; result: string | null }
  'backup:pickImport': { args: []; result: BackupSummary | null }
  'backup:applyImport': { args: [mode: ImportMode]; result: BackupSummary }
  'backup:cancelImport': { args: []; result: void }
  'watchlist:list': { args: []; result: Watchlist[] }
  'watchlist:create': { args: [name: string]; result: Watchlist }
  'watchlist:rename': { args: [id: number, name: string]; result: Watchlist }
  'watchlist:delete': { args: [id: number]; result: void }
  'watchlist:addItem': { args: [id: number, assetId: string]; result: Watchlist }
  'watchlist:removeItem': { args: [id: number, assetId: string]; result: Watchlist }
  'watchlist:reorder': { args: [id: number, orderedAssetIds: string[]]; result: Watchlist }
}

export type IpcChannel = keyof IpcInvokeContract
export type IpcArgs<C extends IpcChannel> = IpcInvokeContract[C]['args']
export type IpcResult<C extends IpcChannel> = IpcInvokeContract[C]['result']

/** Push events: main -> renderer. */
export interface IpcEventContract {
  'connectivity:changed': ConnectivityStatus
  'settings:changed': AppSettings
  'market:tickers': TickerSnapshot
  'analytics:snapshot': AnalyticsSnapshot
  'alerts:changed': AlertsSnapshot
  /** Emitted after a restore so every store reloads. */
  'data:restored': null
}
export type IpcEvent = keyof IpcEventContract
export type IpcEventPayload<E extends IpcEvent> = IpcEventContract[E]

export const IPC_EVENTS: readonly IpcEvent[] = ['connectivity:changed', 'settings:changed', 'market:tickers', 'analytics:snapshot', 'alerts:changed', 'data:restored']

/**
 * Serializable error envelope. Handlers never let raw exceptions cross the
 * bridge; they are converted to this shape so the renderer can show a
 * friendly message while the technical detail stays in the main-process log.
 */
export interface IpcErrorShape {
  code: string
  message: string
}

export type IpcResponse<T> = { ok: true; data: T } | { ok: false; error: IpcErrorShape }
