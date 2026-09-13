import { BrowserWindow, ipcMain } from 'electron'
import { z } from 'zod'
import type {
  IpcArgs,
  IpcChannel,
  IpcEvent,
  IpcEventPayload,
  IpcResponse,
  IpcResult
} from '@shared/ipc'
import { AppError, ErrorCodes } from '../errors'
import { createLogger } from '../logger'

const log = createLogger('ipc')
const registered = new Set<string>()

/**
 * Registers a typed, validated IPC handler.
 *
 * - `schema` validates the argument tuple at runtime; invalid calls are
 *   rejected with a VALIDATION error and never reach the handler.
 * - Exceptions are caught and converted into an IpcResponse envelope. Raw
 *   stack traces never cross into the renderer; they are logged here.
 */
export function handle<C extends IpcChannel>(
  channel: C,
  schema: z.ZodType<IpcArgs<C>>,
  handler: (...args: IpcArgs<C>) => Promise<IpcResult<C>> | IpcResult<C>
): void {
  if (registered.has(channel)) throw new Error(`IPC handler already registered: ${channel}`)
  registered.add(channel)

  ipcMain.handle(channel, async (_event, ...rawArgs: unknown[]): Promise<IpcResponse<IpcResult<C>>> => {
    const parsed = schema.safeParse(rawArgs)
    if (!parsed.success) {
      log.warn(`invalid arguments for ${channel}: ${parsed.error.message}`)
      return { ok: false, error: { code: ErrorCodes.VALIDATION, message: 'Invalid request.' } }
    }
    try {
      const data = await handler(...parsed.data)
      return { ok: true, data }
    } catch (err) {
      return { ok: false, error: toIpcError(channel, err) }
    }
  })
}

function toIpcError(channel: string, err: unknown): { code: string; message: string } {
  if (err instanceof AppError) {
    log.warn(`${channel} failed [${err.code}]: ${err.message}`)
    return { code: err.code, message: err.message }
  }
  const message = err instanceof Error ? err.message : String(err)
  log.error(`${channel} unexpected error: ${message}`, err instanceof Error ? err.stack : '')
  return { code: ErrorCodes.INTERNAL, message: 'Something went wrong. See the application log for details.' }
}

/** Broadcasts a push event to every open renderer window. */
export function emit<E extends IpcEvent>(event: E, payload: IpcEventPayload<E>): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(event, payload)
  }
}

/** Shared zod helpers for argument tuples. */
export const noArgs = z.tuple([])
