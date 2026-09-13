/**
 * Typed IPC contract shared by the main process, preload bridge and renderer.
 *
 * Every channel is declared here with its argument tuple and result type.
 * The main process registers a handler for each channel with runtime (zod)
 * validation of the arguments; the preload bridge only exposes the channels
 * listed here; the renderer calls them through a typed client.
 */
import type { AppInfo, AppSettings, ConnectivityStatus } from './types'

export interface IpcInvokeContract {
  'app:getInfo': { args: []; result: AppInfo }
  'app:openExternal': { args: [url: string]; result: void }
  'app:openPath': { args: [path: string]; result: void }
  'settings:get': { args: []; result: AppSettings }
  'settings:update': { args: [patch: Partial<AppSettings>]; result: AppSettings }
}

export type IpcChannel = keyof IpcInvokeContract
export type IpcArgs<C extends IpcChannel> = IpcInvokeContract[C]['args']
export type IpcResult<C extends IpcChannel> = IpcInvokeContract[C]['result']

/** Push events: main -> renderer. */
export interface IpcEventContract {
  'connectivity:changed': ConnectivityStatus
  'settings:changed': AppSettings
}
export type IpcEvent = keyof IpcEventContract
export type IpcEventPayload<E extends IpcEvent> = IpcEventContract[E]

export const IPC_EVENTS: readonly IpcEvent[] = ['connectivity:changed', 'settings:changed']

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
