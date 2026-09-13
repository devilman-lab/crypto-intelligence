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
  events: { on }
}

export type PreloadApi = typeof api

contextBridge.exposeInMainWorld('api', api)
