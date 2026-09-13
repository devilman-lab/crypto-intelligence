import type { IpcResponse } from '@shared/ipc'

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
  events: window.api.events
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error) return err.message
  return 'Unexpected error.'
}
